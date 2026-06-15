import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CallHistory } from '@/components/CallHistory';
import { CallPanel } from '@/components/CallPanel';
import { CustomerEditForm } from '@/components/CustomerEditForm';
import { DeleteCustomerButton } from '@/components/DeleteCustomerButton';
import { StatusBadge } from '@/components/StatusBadge';
import { MaterialSendButton } from '@/components/MaterialSendButton';
import { TalkScript } from '@/components/TalkScript';
import { isStatus } from '@/lib/constants';
import { getCustomer, getNextCustomerId, listCallLogs } from '@/lib/db';
import type { CustomerFilter } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; industry?: string; due?: string }>;
}

export default async function CustomerDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  // 一覧の絞り込みを引き継ぐ（「戻る」「次の顧客」で保持）
  const sp = await searchParams;
  const filter: CustomerFilter = {
    q: sp.q?.trim() || undefined,
    status: sp.status && isStatus(sp.status) ? sp.status : undefined,
    industry: sp.industry?.trim() || undefined,
    due: sp.due === 'today' ? 'today' : sp.due === 'overdue' ? 'overdue' : undefined,
  };
  const qs = new URLSearchParams();
  if (filter.q) qs.set('q', filter.q);
  if (filter.status) qs.set('status', filter.status);
  if (filter.industry) qs.set('industry', filter.industry);
  if (filter.due) qs.set('due', filter.due);
  const listQuery = qs.toString();
  const suffix = listQuery ? `?${listQuery}` : '';

  const [logs, nextId] = await Promise.all([
    listCallLogs(customerId),
    getNextCustomerId(customerId, filter),
  ]);

  return (
    <div className="detail">
      <div className="detail-nav">
        <Link href={`/${suffix}`} className="back-link">
          ← 一覧へ戻る
        </Link>
        {nextId !== null && (
          <Link href={`/customers/${nextId}${suffix}`} className="next-link">
            次の顧客 →
          </Link>
        )}
      </div>

      <div className="detail-head">
        <h1>{customer.company}</h1>
        {customer.industry && <span className="industry-tag">{customer.industry}</span>}
        <StatusBadge status={customer.status} />
        {customer.website && (
          <a
            className="site-link"
            href={/^https?:\/\//.test(customer.website) ? customer.website : `https://${customer.website}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 サイトを開く
          </a>
        )}
        {customer.email && <MaterialSendButton customer={customer} />}
      </div>

      <TalkScript />

      <div className="detail-grid">
        <section className="card">
          <h2>架電する</h2>
          <CallPanel customer={customer} listQuery={listQuery} />
        </section>

        <section className="card">
          <h2>基本情報</h2>
          <CustomerEditForm customer={customer} />
          <div className="card-footer">
            <DeleteCustomerButton id={customer.id} />
          </div>
        </section>
      </div>

      <section className="card">
        <h2>架電履歴（{logs.length}）</h2>
        <CallHistory logs={logs} />
      </section>
    </div>
  );
}
