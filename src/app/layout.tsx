import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'テレアポ CRM',
  description: '個人用テレアポ顧客管理ツール',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="app-header">
          <Link href="/" className="app-title">
            📞 テレアポ CRM
          </Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
