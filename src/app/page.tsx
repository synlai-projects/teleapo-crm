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
  const caller = normalizeCaller((await cookies()).get(CALLER_COOKIE)?.value);

  // ヘッダーの「あなた」に自動連動：owner未指定なら自分のリストを既定にする。
  // __all__ を選んだとき・「あなた」未選択のときは全員表示。手動の owner 指定が最優先。
  const ownerParam = params.owner?.trim() ?? '';
  let effectiveOwner: string | undefined; // クエリ用（undefined=全員）
  let ownerValue: string; // 「担当」ドロップダウンの選択値
  if (ownerParam === OWNER_ALL) {
    effectiveOwner = undefined;
    ownerValue = OWNER_ALL;
  } else if (ownerParam) {
    effectiveOwner = ownerParam; // メンバー名 or 未割当
    ownerValue = ownerParam;
  } else if (caller) {
    effectiveOwner = caller; // 既定＝自分のリスト
    ownerValue = caller;
  } else {
    effectiveOwner = undefined; // 「あなた」未選択＝全員
    ownerValue = OWNER_ALL;
  }

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
