import { importCsvAction } from '@/lib/actions';

export function CsvButtons() {
  return (
    <div className="csv-buttons">
      <form action={importCsvAction} className="csv-import">
        <label className="file-label">
          CSV取込（会社名・電話・担当者の列）
          <input type="file" name="file" accept=".csv,text/csv" required />
        </label>
        <button type="submit">取込</button>
      </form>
      <a href="/api/export" download="teleapo-customers.csv" className="button-link">
        CSV書き出し
      </a>
    </div>
  );
}
