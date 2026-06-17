import Link from 'next/link';

import { STATUSES } from '@/lib/constants';
import { MEMBERS } from '@/lib/members';
import type { CustomerFilter } from '@/lib/types';

// 「すべての担当」を表す内部値（page.tsx と合わせる）
const OWNER_ALL = '__all__';

interface Props {
  filter: CustomerFilter;
  due: { today: number; overdue: number; contacted: number };
  industries: string[];
  ownerValue: string; // 「担当」ドロップダウンの選択値（メンバー名 / 未割当 / __all__）
}

export function FilterBar({ filter, due, industries, ownerValue }: Props) {
  // チップ（すべて／今日かける／期限切れ）でも今の「担当」絞り込みを保持する
  const ownerQuery = `owner=${encodeURIComponent(ownerValue)}`;

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
        <select name="owner" defaultValue={ownerValue}>
          <option value={OWNER_ALL}>すべての担当</option>
          {MEMBERS.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
          <option value="未割当">未割当</option>
        </select>
        <button type="submit">絞り込み</button>
      </form>

      <div className="quick-filters">
        <Link
          href={`/?${ownerQuery}`}
          className={!filter.due && !filter.hasContact ? 'chip active' : 'chip'}
        >
          すべて
        </Link>
        <Link
          href={`/?${ownerQuery}&due=today`}
          className={filter.due === 'today' ? 'chip active' : 'chip'}
        >
          今日かける（{due.today}）
        </Link>
        <Link
          href={`/?${ownerQuery}&due=overdue`}
          className={filter.due === 'overdue' ? 'chip active' : 'chip'}
        >
          期限切れ（{due.overdue}）
        </Link>
        <Link
          href={`/?${ownerQuery}&contact=1`}
          className={filter.hasContact ? 'chip active' : 'chip'}
        >
          担当者あり（{due.contacted}）
        </Link>
      </div>
    </div>
  );
}
