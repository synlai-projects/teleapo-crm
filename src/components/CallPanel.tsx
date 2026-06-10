import { recordCallAction } from '@/lib/actions';
import { STATUSES } from '@/lib/constants';
import type { Customer } from '@/lib/types';

export function CallPanel({ customer, listQuery }: { customer: Customer; listQuery: string }) {
  return (
    <form action={recordCallAction} className="call-panel stack-form">
      <input type="hidden" name="customerId" defaultValue={customer.id} />
      <input type="hidden" name="listQuery" defaultValue={listQuery} />
      <label>
        架電結果
        <select name="result" defaultValue={customer.status}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label>
        次回架電日
        <input type="date" name="nextCallDate" defaultValue={customer.nextCallDate ?? ''} />
      </label>
      <label>
        通話メモ
        <textarea name="memo" rows={3} placeholder="話した内容・次回のアクションなど" />
      </label>
      <button type="submit">架電を記録して次へ →</button>
    </form>
  );
}
