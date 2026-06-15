import Link from 'next/link';

import { isDue, isOverdue } from '@/lib/date';
import type { Customer } from '@/lib/types';

import { StatusBadge } from './StatusBadge';

export function CustomerTable({
  customers,
  listQuery,
}: {
  customers: Customer[];
  listQuery: string;
}) {
  const suffix = listQuery ? `?${listQuery}` : '';

  if (customers.length === 0) {
    return (
      <p className="empty">該当する顧客がいません。条件を変えるか、新規追加してください。</p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="customer-table">
        <thead>
          <tr>
            <th>会社名</th>
            <th>担当</th>
            <th>業種</th>
            <th>電話番号</th>
            <th>ステータス</th>
            <th>次回架電日</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <Link href={`/customers/${customer.id}${suffix}`} className="company-link">
                  {customer.company}
                </Link>
              </td>
              <td>
                {customer.owner ? (
                  <span className="owner-tag">{customer.owner}</span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                {customer.industry ? (
                  <span className="industry-tag">{customer.industry}</span>
                ) : (
                  '—'
                )}
              </td>
              <td>{customer.phone || '—'}</td>
              <td>
                <StatusBadge status={customer.status} />
              </td>
              <td
                className={
                  isOverdue(customer.nextCallDate)
                    ? 'due overdue'
                    : isDue(customer.nextCallDate)
                      ? 'due'
                      : ''
                }
              >
                {customer.nextCallDate ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
