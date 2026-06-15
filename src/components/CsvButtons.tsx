import { importCsvAction } from '@/lib/actions';
import { MEMBERS } from '@/lib/members';

export function CsvButtons({ defaultOwner }: { defaultOwner: string }) {
  return (
    <div className="csv-buttons">
      <form action={importCsvAction} className="csv-import">
        <label className="file-label">
          CSV取込（会社名・電話・担当者の列）
          <input type="file" name="file" accept=".csv,text/csv" required />
        </label>
        <label className="file-label">
          リスト担当
          <select name="owner" defaultValue={defaultOwner}>
            <option value="">（未割当）</option>
            {MEMBERS.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">取込</button>
      </form>
      <a href="/api/export" download="teleapo-customers.csv" className="button-link">
        CSV書き出し
      </a>
    </div>
  );
}
