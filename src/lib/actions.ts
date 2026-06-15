'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isStatus } from './constants';
import * as db from './db';
import { parseCsv } from './csv';
import { CALLER_COOKIE, normalizeCaller } from './members';
import type { Status } from './types';

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

// 現在「誰として使っているか」をクッキーから取得する（架電者の記録に使う）
async function currentCaller(): Promise<string> {
  const store = await cookies();
  return normalizeCaller(store.get(CALLER_COOKIE)?.value);
}

// 新規顧客の登録
export async function createCustomerAction(formData: FormData): Promise<void> {
  const company = text(formData, 'company');
  if (!company) return; // 会社名は必須

  await db.createCustomer({
    company,
    phone: text(formData, 'phone'),
    contactName: text(formData, 'contactName'),
    industry: text(formData, 'industry'),
    website: text(formData, 'website'),
    email: text(formData, 'email'),
    owner: text(formData, 'owner') || (await currentCaller()),
  });
  revalidatePath('/');
}

// 顧客の基本情報を更新
export async function updateCustomerAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const company = text(formData, 'company');
  if (!company) return;

  const note = text(formData, 'note');
  await db.updateCustomerInfo(id, {
    company,
    phone: text(formData, 'phone'),
    contactName: text(formData, 'contactName'),
    industry: text(formData, 'industry'),
    website: text(formData, 'website'),
    email: text(formData, 'email'),
    owner: text(formData, 'owner'),
    note: note ? note : null,
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath('/');
}

// 架電結果を記録（履歴追加＋ステータス・次回架電日の更新）→ 自動で次の顧客へ
export async function recordCallAction(formData: FormData): Promise<void> {
  const customerId = Number(formData.get('customerId'));
  if (!Number.isInteger(customerId)) return;

  const resultRaw = text(formData, 'result');
  const result: Status = isStatus(resultRaw) ? resultRaw : '未着手';
  const nextCallDate = text(formData, 'nextCallDate');

  // 一覧の絞り込みを引き継ぐ（次の顧客もこの絞り込みの中から選ぶ）
  const listQuery = text(formData, 'listQuery');
  const sp = new URLSearchParams(listQuery);
  const statusParam = sp.get('status') ?? '';
  const dueParam = sp.get('due');
  const filter = {
    q: sp.get('q')?.trim() || undefined,
    status: isStatus(statusParam) ? statusParam : undefined,
    industry: sp.get('industry')?.trim() || undefined,
    owner: sp.get('owner')?.trim() || undefined,
    due: (dueParam === 'today' ? 'today' : dueParam === 'overdue' ? 'overdue' : undefined) as
      | 'today'
      | 'overdue'
      | undefined,
  };

  // 記録するとソート順が変わるため、先に「次の顧客」を確定しておく
  const nextId = await db.getNextCustomerId(customerId, filter);

  await db.recordCall(customerId, {
    result,
    memo: text(formData, 'memo'),
    nextCallDate: nextCallDate ? nextCallDate : null,
    calledBy: await currentCaller(),
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/');

  // 次の顧客があれば自動遷移、最後なら一覧へ（どちらも絞り込みを保持）
  const suffix = listQuery ? `?${listQuery}` : '';
  redirect(nextId ? `/customers/${nextId}${suffix}` : `/${suffix}`);
}

// 資料送付（メール作成画面を開いた）を履歴に残す。ステータスは変えない。
export async function recordMaterialSentAction(customerId: number): Promise<void> {
  if (!Number.isInteger(customerId)) return;
  const customer = await db.getCustomer(customerId);
  if (!customer) return;
  await db.addCallLog(customerId, customer.status, '📧 資料を送付しました', await currentCaller());
  revalidatePath(`/customers/${customerId}`);
}

// 顧客の削除
export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  await db.deleteCustomer(id);
  revalidatePath('/');
  redirect('/');
}

// CSV 取込（列順：会社名・電話・担当者・業種）
// このリストの担当者（owner）は取込時にプルダウンで選ぶ＝取り込む全社へ一括タグ付け。
// 未選択なら「あなた」（ログイン中のメンバー）を担当者にする。
export async function importCsvAction(formData: FormData): Promise<void> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;

  const rows = parseCsv(await file.text());
  if (rows.length === 0) return;

  // このリストの担当者（取込全社に一括で付ける）
  const owner = text(formData, 'owner') || (await currentCaller());

  // 1行目にヘッダらしき語があればスキップ
  const hasHeader = rows[0].some((cell) => /会社|電話|担当|業種|company|phone|name/i.test(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // 列順：会社名・電話・担当者・業種・HP URL・メール（4〜6列目は任意）
  const items = dataRows
    .map((cols) => ({
      company: (cols[0] ?? '').trim(),
      phone: (cols[1] ?? '').trim(),
      contactName: (cols[2] ?? '').trim(),
      industry: (cols[3] ?? '').trim(),
      website: (cols[4] ?? '').trim(),
      email: (cols[5] ?? '').trim(),
      owner,
    }))
    .filter((item) => item.company !== '');

  if (items.length > 0) {
    await db.bulkInsertCustomers(items);
  }
  revalidatePath('/');
}
