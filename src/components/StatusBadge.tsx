import { STATUS_CLASS } from '@/lib/constants';
import type { Status } from '@/lib/types';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{status}</span>;
}
