// 架電担当メンバー（名前ピッカーの選択肢）。増減はここを編集するだけ。
export const MEMBERS = ['渡辺', '小倉', '高野', '高田'] as const;

// 「誰として使っているか」を保存するクッキー名。
// 一度選べば次の顧客に移っても・翌日開いても固定される（プルダウンは切替時だけ）。
export const CALLER_COOKIE = 'teleapo_caller';

// クッキーの値を検証して、登録メンバーでなければ空文字に正規化する
export function normalizeCaller(value: string | undefined | null): string {
  return value && (MEMBERS as readonly string[]).includes(value) ? value : '';
}
