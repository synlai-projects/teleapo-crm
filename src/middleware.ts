import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_COOKIE, expectedToken, isPasswordEnabled } from '@/lib/auth';

// SITE_PASSWORD が設定されている時だけ、未認証のアクセスを /login へ飛ばす。
export async function middleware(req: NextRequest) {
  if (!isPasswordEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === '/login') return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await expectedToken())) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  // ログイン後に元のページへ戻すため遷移元を渡す
  if (pathname && pathname !== '/') url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

// 静的アセットや画像、送付資料PDF（相手はログインしないため）は対象外。
// それ以外（ページ・API）はすべてゲート対象。
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|synlai-service-guide.pdf).*)'],
};
