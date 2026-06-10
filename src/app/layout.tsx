import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { cookies } from 'next/headers';
import Link from 'next/link';

import { CallerPicker } from '@/components/CallerPicker';
import { CALLER_COOKIE, normalizeCaller } from '@/lib/members';

import './globals.css';

export const metadata: Metadata = {
  title: 'テレアポ CRM',
  description: '個人用テレアポ顧客管理ツール',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const caller = normalizeCaller((await cookies()).get(CALLER_COOKIE)?.value);

  return (
    <html lang="ja">
      <body>
        <header className="app-header">
          <Link href="/" className="app-title">
            📞 テレアポ CRM
          </Link>
          <CallerPicker current={caller} />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
