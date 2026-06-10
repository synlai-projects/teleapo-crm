'use client';

import { deleteCustomerAction } from '@/lib/actions';

export function DeleteCustomerButton({ id }: { id: number }) {
  return (
    <form
      action={deleteCustomerAction}
      onSubmit={(event) => {
        if (!confirm('この顧客と架電履歴を削除します。よろしいですか？')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" defaultValue={id} />
      <button type="submit" className="danger">
        削除
      </button>
    </form>
  );
}
