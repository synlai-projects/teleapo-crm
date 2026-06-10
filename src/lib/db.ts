import { mkdirSync } from 'fs';

import { createClient, type Client, type InArgs } from '@libsql/client';

import { isStatus } from './constants';
import type { CallLog, Customer, CustomerFilter, Status } from './types';

// --- 接続管理 -------------------------------------------------------------

// 開発時のホットリロードで接続が増殖しないよう globalThis にキャッシュする。
// スキーマ初期化（CREATE TABLE 等）は一度だけ走らせたいので Promise もキャッシュする。
const globalForDb = globalThis as unknown as {
  teleapoDb?: Client;
  teleapoInit?: Promise<void>;
};

// ローカル開発では data/teleapo.db を使う。
// 本番（Turso 等）では TURSO_DATABASE_URL / TURSO_AUTH_TOKEN を設定する。
function defaultLocalUrl(): string {
  mkdirSync('data', { recursive: true });
  return 'file:data/teleapo.db';
}

function rawClient(): Client {
  if (!globalForDb.teleapoDb) {
    const url = process.env.TURSO_DATABASE_URL ?? defaultLocalUrl();
    const authToken = process.env.TURSO_AUTH_TOKEN;
    globalForDb.teleapoDb = createClient({ url, authToken });
  }
  return globalForDb.teleapoDb;
}

async function ensureSchema(client: Client): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS customers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      company        TEXT NOT NULL,
      phone          TEXT NOT NULL DEFAULT '',
      contact_name   TEXT NOT NULL DEFAULT '',
      industry       TEXT NOT NULL DEFAULT '',
      website        TEXT NOT NULL DEFAULT '',
      email          TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT '未着手',
      next_call_date TEXT,
      note           TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      called_at   TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
      result      TEXT NOT NULL,
      memo        TEXT NOT NULL DEFAULT '',
      called_by   TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON call_logs(customer_id);
  `);

  // 既存DBへのマイグレーション：industry / website / email 列が無ければ追加する
  const cols = await client.execute('PRAGMA table_info(customers)');
  const names = cols.rows.map((r) => r.name as string);
  if (!names.includes('industry')) {
    await client.execute("ALTER TABLE customers ADD COLUMN industry TEXT NOT NULL DEFAULT ''");
  }
  if (!names.includes('website')) {
    await client.execute("ALTER TABLE customers ADD COLUMN website TEXT NOT NULL DEFAULT ''");
  }
  if (!names.includes('email')) {
    await client.execute("ALTER TABLE customers ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  }

  // call_logs に「誰が架電したか」の called_by 列が無ければ追加する
  const callLogCols = await client.execute('PRAGMA table_info(call_logs)');
  const callLogNames = callLogCols.rows.map((r) => r.name as string);
  if (!callLogNames.includes('called_by')) {
    await client.execute("ALTER TABLE call_logs ADD COLUMN called_by TEXT NOT NULL DEFAULT ''");
  }
}

async function getDb(): Promise<Client> {
  const client = rawClient();
  if (!globalForDb.teleapoInit) {
    // 初期化に失敗したらキャッシュを捨てて次回再試行できるようにする
    globalForDb.teleapoInit = ensureSchema(client).catch((err) => {
      globalForDb.teleapoInit = undefined;
      throw err;
    });
  }
  await globalForDb.teleapoInit;
  return client;
}

// --- 行 → ドメイン型のマッピング ------------------------------------------

interface CustomerRow {
  id: number;
  company: string;
  phone: string;
  contact_name: string;
  industry: string;
  website: string;
  email: string;
  status: string;
  next_call_date: string | null;
  note: string | null;
  created_at: string;
}

interface CallLogRow {
  id: number;
  customer_id: number;
  called_at: string;
  result: string;
  memo: string;
  called_by: string;
}

function toStatus(value: string): Status {
  return isStatus(value) ? value : '未着手';
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    company: row.company,
    phone: row.phone,
    contactName: row.contact_name,
    industry: row.industry,
    website: row.website,
    email: row.email,
    status: toStatus(row.status),
    nextCallDate: row.next_call_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapCallLog(row: CallLogRow): CallLog {
  return {
    id: row.id,
    customerId: row.customer_id,
    calledAt: row.called_at,
    result: toStatus(row.result),
    memo: row.memo,
    calledBy: row.called_by ?? '',
  };
}

// --- 顧客 -----------------------------------------------------------------

export interface NewCustomer {
  company: string;
  phone: string;
  contactName: string;
  industry?: string;
  website?: string;
  email?: string;
  status?: Status;
  nextCallDate?: string | null;
  note?: string | null;
}

export async function listCustomers(filter: CustomerFilter = {}): Promise<Customer[]> {
  const where: string[] = [];
  const params: InArgs = [];

  if (filter.q) {
    where.push('(company LIKE ? OR phone LIKE ? OR contact_name LIKE ?)');
    const like = `%${filter.q}%`;
    params.push(like, like, like);
  }
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  if (filter.industry) {
    where.push('industry = ?');
    params.push(filter.industry);
  }
  if (filter.due === 'today') {
    where.push(
      "next_call_date IS NOT NULL AND next_call_date <= date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
    );
  } else if (filter.due === 'overdue') {
    where.push(
      "next_call_date IS NOT NULL AND next_call_date < date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
    );
  }

  const sql =
    'SELECT * FROM customers' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY CASE WHEN next_call_date IS NULL THEN 1 ELSE 0 END,
             next_call_date ASC,
             id DESC`;

  const db = await getDb();
  const rs = await db.execute({ sql, args: params });
  return rs.rows.map((r) => mapCustomer(r as unknown as CustomerRow));
}

// 絞り込み用：登録済みの業種（セグメント）一覧
export async function listIndustries(): Promise<string[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT DISTINCT industry FROM customers WHERE industry <> '' ORDER BY industry",
  );
  return rs.rows.map((r) => r.industry as string);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const db = await getDb();
  const rs = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] });
  const row = rs.rows[0];
  return row ? mapCustomer(row as unknown as CustomerRow) : null;
}

export async function createCustomer(data: NewCustomer): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `INSERT INTO customers (company, phone, contact_name, industry, website, email, status, next_call_date, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))`,
    args: [
      data.company,
      data.phone,
      data.contactName,
      data.industry ?? '',
      data.website ?? '',
      data.email ?? '',
      data.status ?? '未着手',
      data.nextCallDate ?? null,
      data.note ?? null,
    ],
  });
  return Number(rs.lastInsertRowid);
}

export async function updateCustomerInfo(
  id: number,
  data: {
    company: string;
    phone: string;
    contactName: string;
    industry: string;
    website: string;
    email: string;
    note: string | null;
  },
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: 'UPDATE customers SET company = ?, phone = ?, contact_name = ?, industry = ?, website = ?, email = ?, note = ? WHERE id = ?',
    args: [
      data.company,
      data.phone,
      data.contactName,
      data.industry,
      data.website,
      data.email,
      data.note,
      id,
    ],
  });
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDb();
  // FK の ON DELETE CASCADE に依存せず、履歴も明示的に消す（Turso でも確実に動くように）
  await db.batch(
    [
      { sql: 'DELETE FROM call_logs WHERE customer_id = ?', args: [id] },
      { sql: 'DELETE FROM customers WHERE id = ?', args: [id] },
    ],
    'write',
  );
}

export async function bulkInsertCustomers(items: NewCustomer[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = await getDb();
  const sql = `INSERT INTO customers (company, phone, contact_name, industry, website, email, status, next_call_date, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))`;
  const stmts = items.map((row) => ({
    sql,
    args: [
      row.company,
      row.phone,
      row.contactName,
      row.industry ?? '',
      row.website ?? '',
      row.email ?? '',
      row.status ?? '未着手',
      row.nextCallDate ?? null,
      row.note ?? null,
    ] as InArgs,
  }));
  await db.batch(stmts, 'write');
  return items.length;
}

// --- 架電 -----------------------------------------------------------------

// 架電結果を記録する：履歴に1件追加し、顧客のステータスと次回架電日を更新する
export async function recordCall(
  customerId: number,
  data: { result: Status; memo: string; nextCallDate: string | null; calledBy: string },
): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      {
        sql: "INSERT INTO call_logs (customer_id, called_at, result, memo, called_by) VALUES (?, datetime('now', '+9 hours'), ?, ?, ?)",
        args: [customerId, data.result, data.memo, data.calledBy],
      },
      {
        sql: 'UPDATE customers SET status = ?, next_call_date = ? WHERE id = ?',
        args: [data.result, data.nextCallDate, customerId],
      },
    ],
    'write',
  );
}

// ステータスを変えずに履歴へ1件だけ追加する（資料送付などの記録用）
export async function addCallLog(
  customerId: number,
  result: Status,
  memo: string,
  calledBy: string,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO call_logs (customer_id, called_at, result, memo, called_by) VALUES (?, datetime('now', '+9 hours'), ?, ?, ?)",
    args: [customerId, result, memo, calledBy],
  });
}

export async function listCallLogs(customerId: number): Promise<CallLog[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: 'SELECT * FROM call_logs WHERE customer_id = ? ORDER BY called_at DESC, id DESC',
    args: [customerId],
  });
  return rs.rows.map((r) => mapCallLog(r as unknown as CallLogRow));
}

// --- 集計 -----------------------------------------------------------------

export async function countDue(): Promise<{ today: number; overdue: number }> {
  const db = await getDb();
  const [todayRs, overdueRs] = await db.batch(
    [
      "SELECT COUNT(*) AS c FROM customers WHERE next_call_date IS NOT NULL AND next_call_date <= date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
      "SELECT COUNT(*) AS c FROM customers WHERE next_call_date IS NOT NULL AND next_call_date < date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
    ],
    'read',
  );
  return {
    today: Number(todayRs.rows[0].c),
    overdue: Number(overdueRs.rows[0].c),
  };
}

// 一覧の表示順（次回架電日 昇順）で「次の顧客」の ID を返す。末尾なら null
export async function getNextCustomerId(
  currentId: number,
  filter: CustomerFilter = {},
): Promise<number | null> {
  const list = await listCustomers(filter);
  const index = list.findIndex((c) => c.id === currentId);
  if (index === -1) {
    return list.length > 0 ? list[0].id : null;
  }
  const next = list[index + 1];
  return next ? next.id : null;
}
