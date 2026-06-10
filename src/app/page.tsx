import { CsvButtons } from '@/components/CsvButtons';
import { CustomerTable } from '@/components/CustomerTable';
import { FilterBar } from '@/components/FilterBar';
import { NewCustomerForm } from '@/components/NewCustomerForm';
import { isStatus } from '@/lib/constants';
import { countDue, listCustomers, listIndustries } from '@/lib/db';
import type { CustomerFilter } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; industry?: string; due?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;

  const filter: CustomerFilter = {
    q: params.q?.trim() || undefined,
    status: params.status && isStatus(params.status) ? params.status : undefined,
    industry: params.industry?.trim() || undefined,
    due:
      params.due === 'today' ? 'today' : params.due === 'overdue' ? 'overdue' : undefined,
  };

  const [customers, industries, due] = await Promise.all([
    listCustomers(filter),
    listIndustries(),
    countDue(),
  ]);

  // 詳細画面に渡して「戻る」「次の顧客」で絞り込みを保持するためのクエリ文字列
  const sp = new URLSearchParams();
  if (filter.q) sp.set('q', filter.q);
  if (filter.status) sp.set('status', filter.status);
  if (filter.industry) sp.set('industry', filter.industry);
  if (filter.due) sp.set('due', filter.due);
  const listQuery = sp.toString();

  return (
    <div className="stack">
      <div className="toolbar">
        <NewCustomerForm />
        <CsvButtons />
      </div>

      <FilterBar filter={filter} due={due} industries={industries} />

      <p className="result-count">{customers.length} 件</p>
      <CustomerTable customers={customers} listQuery={listQuery} />
    </div>
  );
}
