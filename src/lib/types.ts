// テレアポ CRM 共通の型定義

// 架電ステータス（標準5区分）
export type Status =
  | '未着手'
  | '不在・再コール'
  | '見込みあり'
  | 'アポ獲得'
  | 'NG';

// 顧客
export interface Customer {
  id: number;
  company: string; // 会社名
  phone: string; // 電話番号
  contactName: string; // 担当者名
  industry: string; // 業種・セグメント（製造 / 広告・BPO など）
  website: string; // HP URL（ワンクリックで開く）
  email: string; // メールアドレス（資料送付に使う）
  status: Status; // 現在の架電ステータス
  nextCallDate: string | null; // 次回架電日（YYYY-MM-DD）
  note: string | null; // 補足メモ
  createdAt: string; // 登録日時
}

// 架電履歴（1顧客に複数ぶら下がる）
export interface CallLog {
  id: number;
  customerId: number;
  calledAt: string; // 架電日時
  result: Status; // 架電結果（＝そのときのステータス）
  memo: string; // 通話メモ
}

// 一覧の絞り込み条件
export interface CustomerFilter {
  q?: string; // 会社名・電話・担当者のキーワード検索
  status?: Status; // ステータス絞り込み
  industry?: string; // 業種絞り込み
  due?: 'today' | 'overdue'; // 今日かける / 期限切れ
}
