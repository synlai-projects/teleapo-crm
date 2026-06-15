import { cookies } from 'next/headers';

import { CsvButtons } from '@/components/CsvButtons';
import { CustomerTable } from '@/components/CustomerTable';
import { FilterBar } from '@/components/FilterBar';
import { NewCustomerForm } from '@/components/NewCustomerForm';
import { isStatus } from '@/lib/constants';
import { countDue, listCustomers, listIndustries } from '@/lib/db';
import { CALLER_COOKIE, normalizeCaller } from '@/lib/members';
import type { CustomerFilter } from '@/lib/types';

export const dynamic = 'force-dynamic';

// 「担当」絞り込みの内部値：__all__ は「明示的に全員を見る」指定
const OWNER_ALL = '__all__';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    industry?: string;
    owner?: string;
    due?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  // ヘッダーの「あなた」＝架電者（新規/取込のリスト担当の既定にだけ使う）。
  const caller = normalizeCaller((await cookies()).get(CALLER_COOKIE)?.value);

  // 表示するリストは「担当」絞り込みで選ぶ。架電者（あなた）とは別物
  // （例：高田のリストを小倉がかける）。件数もこの絞り込みに連動する。
  // 未指定・__all__ は全員表示。
  const ownerParam = params.owner?.trim() ?? '';
  const effectiveOwner =
    ownerParam && ownerParam !== OWNER_ALL ? ownerParam : undefined; // undefined=全員
  const ownerValue = effectiveOwner ?? OWNER_ALL; // 「担当」ドロップダウンの選択値

  const filter: CustomerFilter = {
    q: params.q?.trim() || undefined,
    status: params.status && isStatus(params.status) ? params.status : undefined,
    industry: params.industry?.trim() || undefined,
    owner: effectiveOwner,
    due:
      params.due === 'today' ? 'today' : params.due === 'overdue' ? 'overdue' : undefined,
  };

  const [customers, industries, due] = await Promise.all([
    listCustomers(filter),
    listIndustries(),
    countDue(effectiveOwner),
  ]);

  // 詳細画面に渡して「戻る」「次の顧客」で絞り込みを保持するためのクエリ文字列
  const sp = new URLSearchParams();
  if (filter.q) sp.set('q', filter.q);
  if (filter.status) sp.set('status', filter.status);
  if (filter.industry) sp.set('industry', filter.industry);
  if (filter.owner) sp.set('owner', filter.owner);
  if (filter.due) sp.set('due', filter.due);
  const listQuery = sp.toString();

  return (
    <div className="stack">
      <div className="toolbar">
        <NewCustomerForm defaultOwner={caller} />
        <CsvButtons defaultOwner={caller} />
      </div>

      <FilterBar filter={filter} due={due} industries={industries} ownerValue={ownerValue} />

      <p className="result-count">{customers.length} 件</p>
      <CustomerTable customers={customers} listQuery={listQuery} />
    </div>
  );
}
