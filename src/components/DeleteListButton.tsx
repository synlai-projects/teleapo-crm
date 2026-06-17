'use client';

import { deleteOwnerListAction } from '@/lib/actions';

// リスト担当（owner）ごとに全件削除するボタン。取込ミスのやり直し用。
// 担当を1つに絞った一覧でだけ表示し、クリック時に確認ダイアログを必ず出す。
export function DeleteListButton({ owner, count }: { owner: string; count: number }) {
  return (
    <form
      action={deleteOwnerListAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `「${owner}」のリスト ${count} 件をすべて削除します。\n架電履歴ごと消え、元に戻せません。よろしいですか？`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="owner" value={owner} />
      <button type="submit" className="danger-button">
        🗑 {owner}のリストを全削除（{count}）
      </button>
    </form>
  );
}
