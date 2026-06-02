import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import type { ChannelParam } from '@/utils/types';

/**
 * UploadPreviewTable
 *
 * Renders the parsed channel/subchannel rows returned from the parse endpoint.
 * Channels are expandable rows; subchannels appear as indented child rows.
 * All channels start expanded. Supports an empty state when the parsed data
 * has no channels.
 *
 * @param {{ channels: ChannelParam[] }} props
 */
interface UploadPreviewTableProps {
  channels: ChannelParam[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtRoi = (n: number) => n.toFixed(4);

export function UploadPreviewTable({ channels }: UploadPreviewTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(channels.map((c) => [c.channel_name, true])),
  );

  if (!channels.length) {
    return <EmptyState title="No channels parsed" message="The file contained no valid channel rows." />;
  }

  const toggle = (name: string) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-[12.5px]">
        <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
          <tr>
            <th className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold w-8" />
            <th className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold">Channel / Subchannel</th>
            <th className="px-4 py-2.5 text-right ui-eyebrow text-[var(--ink-500)] font-semibold">ROI Coefficient</th>
            <th className="px-4 py-2.5 text-right ui-eyebrow text-[var(--ink-500)] font-semibold">Min Spend</th>
            <th className="px-4 py-2.5 text-right ui-eyebrow text-[var(--ink-500)] font-semibold">Max Spend</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => (
            <>
              {/* Channel row */}
              <tr
                key={channel.channel_name}
                className="border-b border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
                onClick={() => toggle(channel.channel_name)}
              >
                <td className="px-4 py-2.5 text-[var(--ink-400)]">
                  {expanded[channel.channel_name]
                    ? <ChevronDown size={14} />
                    : <ChevronRight size={14} />
                  }
                </td>
                <td className="px-4 py-2.5 font-semibold text-[var(--ink-900)]">
                  {channel.channel_name}
                  <span className="ml-2 text-[11px] text-[var(--ink-400)] font-normal">
                    ({channel.subchannels.length} subchannel{channel.subchannels.length !== 1 ? 's' : ''})
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[var(--ink-700)]">{fmtRoi(channel.roi_coefficient)}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ink-700)]">{fmt(channel.min_spend)}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ink-700)]">{fmt(channel.max_spend)}</td>
              </tr>

              {/* Subchannel rows */}
              {expanded[channel.channel_name] && channel.subchannels.map((sub) => (
                <tr
                  key={`${channel.channel_name}-${sub.subchannel_name}`}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--brand-50)] transition-colors"
                >
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 pl-10 text-[var(--ink-700)]">
                    <span className="text-[var(--ink-300)] mr-1.5">└</span>
                    {sub.subchannel_name}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--ink-600)]">{fmtRoi(sub.roi_coefficient)}</td>
                  <td className="px-4 py-2 text-right text-[var(--ink-600)]">{fmt(sub.min_spend)}</td>
                  <td className="px-4 py-2 text-right text-[var(--ink-600)]">{fmt(sub.max_spend)}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
