import { toCsv } from '@/lib/csv';
import { listCustomers } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 全顧客を CSV でダウンロードさせる
export async function GET(): Promise<Response> {
  const customers = listCustomers();
  const header = ['会社名', '電話番号', '担当者名', '業種', 'HP URL', 'メール', 'ステータス', '次回架電日', 'メモ', '登録日時'];
  const rows = customers.map((c) => [
    c.company,
    c.phone,
    c.contactName,
    c.industry,
    c.website,
    c.email,
    c.status,
    c.nextCallDate ?? '',
    c.note ?? '',
    c.createdAt,
  ]);

  // Excel で文字化けしないよう先頭に BOM を付与
  const body = '﻿' + toCsv([header, ...rows]);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="teleapo-customers.csv"',
    },
  });
}
