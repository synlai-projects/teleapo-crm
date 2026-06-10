'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AUTH_COOKIE, expectedToken } from './auth';

// 遷移先がローカルパスであることを保証する（オープンリダイレクト防止）
function safePath(from: string): string {
  return from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

// ログインフォームの送信先。共通パスワードが一致したら認証クッキーを発行する。
export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const from = safePath(String(formData.get('from') ?? '/'));

  if (password !== (process.env.SITE_PASSWORD ?? '')) {
    const params = new URLSearchParams({ error: '1' });
    if (from !== '/') params.set('from', from);
    redirect(`/login?${params.toString()}`);
  }

  const store = await cookies();
  store.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30日（端末ごとに初回1回だけ入力）
    path: '/',
  });

  redirect(from);
}
