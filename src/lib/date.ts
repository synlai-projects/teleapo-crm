// 日本時間(JST=UTC+9)の「今日」を YYYY-MM-DD で返す（サーバーのタイムゾーンに依存しない）
export function todayStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// 次回架電日が今日以前か（今日かけるべきか）
export function isDue(date: string | null): boolean {
  if (!date) return false;
  return date <= todayStr();
}

// 次回架電日が過ぎているか（昨日以前）
export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return date < todayStr();
}
