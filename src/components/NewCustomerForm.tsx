import { createCustomerAction } from '@/lib/actions';

export function NewCustomerForm() {
  return (
    <details className="new-customer">
      <summary>＋ 新規顧客を追加</summary>
      <form action={createCustomerAction} className="stack-form">
        <label>
          会社名（必須）
          <input type="text" name="company" required />
        </label>
        <label>
          電話番号
          <input type="text" name="phone" />
        </label>
        <label>
          担当者名
          <input type="text" name="contactName" />
        </label>
        <label>
          業種・セグメント
          <input type="text" name="industry" placeholder="製造 / 広告・BPO など" />
        </label>
        <label>
          HP URL
          <input type="url" name="website" placeholder="https://..." />
        </label>
        <label>
          メールアドレス
          <input type="email" name="email" placeholder="info@..." />
        </label>
        <button type="submit">登録</button>
      </form>
    </details>
  );
}
