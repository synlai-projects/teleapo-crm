'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CALLER_COOKIE, MEMBERS } from '@/lib/members';

// ヘッダーの「あなた」名前ピッカー。
// 選んだ名前はクッキーに1年保存されるので、次の顧客へ移っても・翌日開いても固定される。
// 変えたいときだけプルダウンで切り替える（毎回選ぶ必要はない）。
export function CallerPicker({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setValue(next);
    // path=/ で全ページ共通・max-age=1年で永続化
    document.cookie = `${CALLER_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    // サーバー側（架電記録）が新しい名前を読めるよう再取得
    router.refresh();
  }

  return (
    <label className="caller-picker">
      <span className="caller-label">あなた</span>
      <select value={value} onChange={handleChange} aria-label="架電担当者">
        <option value="">（未選択）</option>
        {MEMBERS.map((member) => (
          <option key={member} value={member}>
            {member}
          </option>
        ))}
      </select>
    </label>
  );
}
