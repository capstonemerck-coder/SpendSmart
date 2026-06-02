import { Badge } from '@/components/shared';

/**
 * UploadStatusBadge
 *
 * Renders a color-coded pill badge for upload status values.
 * Stateless presentational component reused across DataInput and DataHistory.
 *
 * Supported statuses: 'pending', 'processing', 'success', 'failed'
 *
 * @param {{ status: string }} props
 */
interface UploadStatusBadgeProps {
  status: string;
}

export function UploadStatusBadge({ status }: UploadStatusBadgeProps) {
  const lower = status.toLowerCase();
  if (lower === 'success') return <Badge tone="success">Completed</Badge>;
  if (lower === 'failed') return <Badge tone="danger">Failed</Badge>;
  if (lower === 'pending') return <Badge tone="warning">Pending</Badge>;
  if (lower === 'processing') return <Badge tone="brand">Processing</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}
