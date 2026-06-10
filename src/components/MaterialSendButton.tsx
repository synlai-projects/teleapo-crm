'use client';

import { useTransition } from 'react';

import { recordMaterialSentAction } from '@/lib/actions';
import { materialMailtoHref } from '@/lib/mail';
import type { Customer } from '@/lib/types';

// 「📧 資料送付」ボタン。クリックで Gmail の作成画面を開きつつ、
// 「資料を送付しました」を架電履歴に記録する。
export function MaterialSendButton({ customer }: { customer: Customer }) {
  const [, startTransition] = useTransition();
  return (
    <a
      className="mail-link"
      href={materialMailtoHref(customer)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => startTransition(() => void recordMaterialSentAction(customer.id))}
    >
      📧 資料送付
    </a>
  );
}
