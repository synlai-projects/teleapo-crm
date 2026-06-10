/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 はネイティブモジュールのため、サーバー側でバンドルから除外する
  serverExternalPackages: ['better-sqlite3'],
  // ホーム直下の別 lockfile を誤検出しないよう、このプロジェクトをルートに固定
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
