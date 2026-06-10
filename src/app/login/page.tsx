import { redirect } from 'next/navigation';

import { loginAction } from '@/lib/auth-actions';
import { isPasswordEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // パスワード保護が無効な環境ではログイン画面は不要
  if (!isPasswordEnabled()) redirect('/');

  const sp = await searchParams;
  const from = sp.from ?? '/';
  const hasError = sp.error === '1';

  return (
    <div className="login-wrap">
      <form action={loginAction} className="login-card">
        <h1>📞 テレアポ CRM</h1>
        <p className="login-lead">続けるにはチーム共通パスワードを入力してください。</p>
        <input type="hidden" name="from" value={from} />
        <input
          type="password"
          name="password"
          placeholder="パスワード"
          autoFocus
          required
          className="login-input"
        />
        {hasError && <p className="login-error">パスワードが違います。</p>}
        <button type="submit" className="login-button">
          ログイン
        </button>
      </form>
    </div>
  );
}
