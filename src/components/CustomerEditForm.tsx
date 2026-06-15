import { updateCustomerAction } from '@/lib/actions';
import { MEMBERS } from '@/lib/members';
import type { Customer } from '@/lib/types';

export function CustomerEditForm({ customer }: { customer: Customer }) {
  return (
    <form action={updateCustomerAction} className="stack-form">
      <input type="hidden" name="id" defaultValue={customer.id} />
      <label>
        会社名
        <input type="text" name="company" defaultValue={customer.company} required />
      </label>
      <label>
        リスト担当
        <select name="owner" defaultValue={customer.owner}>
          <option value="">（未割当）</option>
          {MEMBERS.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>
      </label>
      <label>
        電話番号
        <input type="text" name="phone" defaultValue={customer.phone} />
      </label>
      <label>
        担当者名
        <input type="text" name="contactName" defaultValue={customer.contactName} />
      </label>
      <label>
        業種・セグメント
        <input type="text" name="industry" defaultValue={customer.industry} />
      </label>
      <label>
        HP URL
        <input type="url" name="website" defaultValue={customer.website} placeholder="https://..." />
      </label>
      <label>
        メールアドレス
        <input type="email" name="email" defaultValue={customer.email} placeholder="info@..." />
      </label>
      <label>
        メモ
        <textarea name="note" rows={2} defaultValue={customer.note ?? ''} />
      </label>
      <button type="submit">保存</button>
    </form>
  );
}
