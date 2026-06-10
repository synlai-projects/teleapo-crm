import type { Status } from './types';

// 架電ステータスの一覧（表示順）
export const STATUSES: readonly Status[] = [
  '未着手',
  '不在・再コール',
  '見込みあり',
  'アポ獲得',
  'NG',
] as const;

// ステータスごとの CSS クラス名（globals.css 側で色を定義）
export const STATUS_CLASS: Record<Status, string> = {
  未着手: 'status-new',
  '不在・再コール': 'status-callback',
  見込みあり: 'status-warm',
  アポ獲得: 'status-won',
  NG: 'status-lost',
};

// 文字列が有効なステータスかどうかを判定する型ガード
export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}
