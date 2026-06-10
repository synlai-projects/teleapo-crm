// 依存ライブラリを使わない簡易 CSV パーサ／シリアライザ

// CSV 文字列を二次元配列に変換する（カンマ区切り・ダブルクオート対応）
export function parseCsv(text: string): string[][] {
  // 先頭の BOM を除去
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"'; // エスケープされた二重引用符
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // CR は無視（CRLF / LF 双方に対応）
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // 最後のフィールド／行を回収
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 完全な空行は除外
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// 二次元配列を CSV 文字列に変換する
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
