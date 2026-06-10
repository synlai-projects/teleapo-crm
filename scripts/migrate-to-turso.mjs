// ローカルの data/teleapo.db を、Turso(本番)の空DBへ丸ごと移すワンショットスクリプト。
//
// 使い方（PowerShell）:
//   $env:TURSO_DATABASE_URL="libsql://xxx.turso.io"; $env:TURSO_AUTH_TOKEN="..."; node scripts/migrate-to-turso.mjs
//
// ※ 移行先は空DB前提。すでにデータがあると中断する（--force で上書き実行）。

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const force = process.argv.includes('--force');

if (!url || !url.startsWith('libsql')) {
  console.error('エラー: TURSO_DATABASE_URL（libsql://...）を環境変数で指定してください。');
  process.exit(1);
}

const src = createClient({ url: 'file:data/teleapo.db' });
const dst = createClient({ url, authToken });

const SCHEMA = `
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
`;

async function main() {
  await dst.executeMultiple(SCHEMA);

  const existing = await dst.execute('SELECT COUNT(*) AS c FROM customers');
  if (Number(existing.rows[0].c) > 0 && !force) {
    console.error(
      `移行先に既に ${existing.rows[0].c} 件あります。重複を防ぐため中断しました。やり直すなら空DBで実行してください。`,
    );
    process.exit(1);
  }

  const customers = await src.execute('SELECT * FROM customers ORDER BY id');
  const logs = await src.execute('SELECT * FROM call_logs ORDER BY id');

  const stmts = [
    ...customers.rows.map((r) => ({
      sql: `INSERT INTO customers (id, company, phone, contact_name, industry, website, email, status, next_call_date, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        r.id,
        r.company,
        r.phone,
        r.contact_name,
        r.industry,
        r.website,
        r.email,
        r.status,
        r.next_call_date,
        r.note,
        r.created_at,
      ],
    })),
    ...logs.rows.map((r) => ({
      sql: `INSERT INTO call_logs (id, customer_id, called_at, result, memo, called_by)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [r.id, r.customer_id, r.called_at, r.result, r.memo, r.called_by ?? ''],
    })),
  ];

  if (stmts.length > 0) await dst.batch(stmts, 'write');

  console.log(`移行完了: customers=${customers.rows.length} 件 / call_logs=${logs.rows.length} 件`);
}

main().catch((err) => {
  console.error('移行失敗:', err.message);
  process.exit(1);
});
