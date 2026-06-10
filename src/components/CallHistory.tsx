import type { CallLog } from '@/lib/types';

import { StatusBadge } from './StatusBadge';

export function CallHistory({ logs }: { logs: CallLog[] }) {
  if (logs.length === 0) {
    return <p className="empty">まだ架電履歴がありません。</p>;
  }

  return (
    <ul className="call-history">
      {logs.map((log) => (
        <li key={log.id}>
          <div className="log-head">
            <StatusBadge status={log.result} />
            {log.calledBy && <span className="log-caller">👤 {log.calledBy}</span>}
            <time>{log.calledAt}</time>
          </div>
          {log.memo && <p className="log-memo">{log.memo}</p>}
        </li>
      ))}
    </ul>
  );
}
