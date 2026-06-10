import type { Customer } from './types';

// ── 資料送付メール テンプレート ──
// satoruはGmail利用のため、Gmailの作成画面を直接開くURLを生成する。
// 件名・本文・署名・リンクはこのファイルを編集すればOK。{会社名}は各社に自動で差し込まれます。

const SERVICE_URL = 'https://synlai.net/services/ai-dev/';
const SUBJECT = '【ご案内】業務システムの受託開発について｜Synlai';
const RULE = '――――――――――――――――――――';

const SIGNATURE = `${RULE}
Synlai株式会社 代表取締役 高田 悟（Takata Satoru）
東京都中央区日本橋人形町3-7-2
TEL：080-4005-5289 ／ E-mail：satoru@synlai.jp
URL：https://www.synlai.net/
${RULE}`;

export function materialMailtoHref(customer: Customer): string {
  const body = `${customer.company} ご担当者様

お世話になっております。Synlai（シンライ）の高田です。
先ほどはお電話のお時間をいただき、ありがとうございました。

弊社は、御社の業務に合わせた業務システム・AIの受託開発を行っております。既製のパッケージでは対応しきれない独自の業務も、御社専用に設計・構築いたします。
強みは、ご契約前に “実際に動く画面” を無料でお作りすること。仕様書や口頭の説明だけでなく、実際に触っていただいた上でご判断いただけます。

具体的なイメージや開発事例は、こちらをご覧ください。
▼ AI・業務システムの受託開発（Synlai）
${SERVICE_URL}

「こんなことはできる？」というご相談だけでも歓迎です。
本メールへのご返信、またはお電話で、お気軽にお声がけください。

${SIGNATURE}`;

  return (
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(customer.email)}` +
    `&su=${encodeURIComponent(SUBJECT)}` +
    `&body=${encodeURIComponent(body)}`
  );
}
