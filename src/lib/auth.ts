// チーム共通パスワードによる簡易アクセス制限。
// 環境変数 SITE_PASSWORD が設定されている時だけ有効になる（未設定＝ゲートなし＝ローカル開発はそのまま）。
// ※ middleware（Edge ランタイム）からも import されるので Node 専用APIは使わず Web Crypto を使う。

export const AUTH_COOKIE = 'teleapo_auth';

// パスワード保護が有効か（本番でのみ env を設定する想定）
export function isPasswordEnabled(): boolean {
  return !!process.env.SITE_PASSWORD;
}

// クッキーに入れる検証用トークン（平文パスワードは保存せず、ハッシュを保存する）
export async function expectedToken(): Promise<string> {
  const password = process.env.SITE_PASSWORD ?? '';
  const data = new TextEncoder().encode(`teleapo:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
