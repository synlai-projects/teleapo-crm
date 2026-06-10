import Link from 'next/link';

import { STATUSES } from '@/lib/constants';
import type { CustomerFilter } from '@/lib/types';

interface Props {
  filter: CustomerFilter;
  due: { today: number; overdue: number };
  industries: string[];
}

export function FilterBar({ filter, due, industries }: Props) {
  return (
    <div className="filter-bar">
      <form method="get" className="search-form">
        <input
          type="text"
          name="q"
          defaultValue={filter.q ?? ''}
          placeholder="会社名・電話・担当者で検索"
        />
        <select name="status" defaultValue={filter.status ?? ''}>
          <option value="">すべてのステータス</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {industries.length > 0 && (
          <select name="industry" defaultValue={filter.industry ?? ''}>
            <option value="">すべての業種</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        )}
        <button type="submit">絞り込み</button>
      </form>

      <div className="quick-filters">
        <Link href="/" className={!filter.due ? 'chip active' : 'chip'}>
          すべて
        </Link>
        <Link href="/?due=today" className={filter.due === 'today' ? 'chip active' : 'chip'}>
          今日かける（{due.today}）
        </Link>
        <Link
          href="/?due=overdue"
          className={filter.due === 'overdue' ? 'chip active' : 'chip'}
        >
          期限切れ（{due.overdue}）
        </Link>
      </div>
    </div>
  );
}
