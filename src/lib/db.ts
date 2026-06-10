import { mkdirSync } from 'fs';
import { join } from 'path';

import Database from 'better-sqlite3';

import { isStatus } from './constants';
import type { CallLog, Customer, CustomerFilter, Status } from './types';

// --- 接続管理 -------------------------------------------------------------

// 開発時のホットリロードで接続が増殖しないよう globalThis にキャッシュする
const globalForDb = globalThis as unknown as { teleapoDb?: Database.Database };

function createConnection(): Database.Database {
  const dataDir = join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });

  const db = new Database(join(dataDir, 'teleapo.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON call_logs(customer_id);
  `);

  // 既存DBへのマイグレーション：industry / website 列が無ければ追加する
  const customerCols = db.prepare('PRAGMA table_info(customers)').all() as { name: string }[];
  if (!customerCols.some((c) => c.name === 'industry')) {
    db.exec("ALTER TABLE customers ADD COLUMN industry TEXT NOT NULL DEFAULT ''");
  }
  if (!customerCols.some((c) => c.name === 'website')) {
    db.exec("ALTER TABLE customers ADD COLUMN website TEXT NOT NULL DEFAULT ''");
  }
  if (!customerCols.some((c) => c.name === 'email')) {
    db.exec("ALTER TABLE customers ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  }

  return db;
}

function getDb(): Database.Database {
  if (!globalForDb.teleapoDb) {
    globalForDb.teleapoDb = createConnection();
  }
  return globalForDb.teleapoDb;
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

export function listCustomers(filter: CustomerFilter = {}): Customer[] {
  const where: string[] = [];
  const params: string[] = [];

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

  const rows = getDb().prepare(sql).all(...params) as CustomerRow[];
  return rows.map(mapCustomer);
}

// 絞り込み用：登録済みの業種（セグメント）一覧
export function listIndustries(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT industry FROM customers WHERE industry <> '' ORDER BY industry")
    .all() as { industry: string }[];
  return rows.map((r) => r.industry);
}

export function getCustomer(id: number): Customer | null {
  const row = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as
    | CustomerRow
    | undefined;
  return row ? mapCustomer(row) : null;
}

export function createCustomer(data: NewCustomer): number {
  const info = getDb()
    .prepare(
      `INSERT INTO customers (company, phone, contact_name, industry, website, email, status, next_call_date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))`,
    )
    .run(
      data.company,
      data.phone,
      data.contactName,
      data.industry ?? '',
      data.website ?? '',
      data.email ?? '',
      data.status ?? '未着手',
      data.nextCallDate ?? null,
      data.note ?? null,
    );
  return Number(info.lastInsertRowid);
}

export function updateCustomerInfo(
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
): void {
  getDb()
    .prepare(
      'UPDATE customers SET company = ?, phone = ?, contact_name = ?, industry = ?, website = ?, email = ?, note = ? WHERE id = ?',
    )
    .run(data.company, data.phone, data.contactName, data.industry, data.website, data.email, data.note, id);
}

export function deleteCustomer(id: number): void {
  getDb().prepare('DELETE FROM customers WHERE id = ?').run(id);
}

export function bulkInsertCustomers(items: NewCustomer[]): number {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO customers (company, phone, contact_name, industry, website, email, status, next_call_date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))`,
  );
  const insertMany = db.transaction((rows: NewCustomer[]) => {
    for (const row of rows) {
      stmt.run(
        row.company,
        row.phone,
        row.contactName,
        row.industry ?? '',
        row.website ?? '',
        row.email ?? '',
        row.status ?? '未着手',
        row.nextCallDate ?? null,
        row.note ?? null,
      );
    }
  });
  insertMany(items);
  return items.length;
}

// --- 架電 -----------------------------------------------------------------

// 架電結果を記録する：履歴に1件追加し、顧客のステータスと次回架電日を更新する
export function recordCall(
  customerId: number,
  data: { result: Status; memo: string; nextCallDate: string | null },
): void {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare(
      "INSERT INTO call_logs (customer_id, called_at, result, memo) VALUES (?, datetime('now', '+9 hours'), ?, ?)",
    ).run(customerId, data.result, data.memo);
    db.prepare('UPDATE customers SET status = ?, next_call_date = ? WHERE id = ?').run(
      data.result,
      data.nextCallDate,
      customerId,
    );
  });
  run();
}

// ステータスを変えずに履歴へ1件だけ追加する（資料送付などの記録用）
export function addCallLog(customerId: number, result: Status, memo: string): void {
  getDb()
    .prepare(
      "INSERT INTO call_logs (customer_id, called_at, result, memo) VALUES (?, datetime('now', '+9 hours'), ?, ?)",
    )
    .run(customerId, result, memo);
}

export function listCallLogs(customerId: number): CallLog[] {
  const rows = getDb()
    .prepare('SELECT * FROM call_logs WHERE customer_id = ? ORDER BY called_at DESC, id DESC')
    .all(customerId) as CallLogRow[];
  return rows.map(mapCallLog);
}

// --- 集計 -----------------------------------------------------------------

export function countDue(): { today: number; overdue: number } {
  const db = getDb();
  const today = db
    .prepare(
      "SELECT COUNT(*) AS c FROM customers WHERE next_call_date IS NOT NULL AND next_call_date <= date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
    )
    .get() as { c: number };
  const overdue = db
    .prepare(
      "SELECT COUNT(*) AS c FROM customers WHERE next_call_date IS NOT NULL AND next_call_date < date('now', '+9 hours') AND status NOT IN ('NG', 'アポ獲得')",
    )
    .get() as { c: number };
  return { today: today.c, overdue: overdue.c };
}

// 一覧の表示順（次回架電日 昇順）で「次の顧客」の ID を返す。末尾なら null
export function getNextCustomerId(currentId: number, filter: CustomerFilter = {}): number | null {
  const list = listCustomers(filter);
  const index = list.findIndex((c) => c.id === currentId);
  if (index === -1) {
    return list.length > 0 ? list[0].id : null;
  }
  const next = list[index + 1];
  return next ? next.id : null;
}
