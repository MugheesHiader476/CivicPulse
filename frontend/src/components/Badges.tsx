import { Flame, Minus, MoveDown } from "lucide-react";
import type { Category, Priority, Status } from "../api/client";
import { formatMs } from "../lib/format";
import { CATEGORY_META, PRIORITY_META, STATUS_META, describeProvider } from "../lib/presentation";

const PRIORITY_ICONS = { high: Flame, normal: Minus, low: MoveDown } as const;

export function CategoryBadge({ category, large = false }: { category: Category; large?: boolean }) {
  const { label, icon: Icon } = CATEGORY_META[category];
  return (
    <span className={`badge badge-category${large ? " badge-lg" : ""}`} data-category={category}>
      <Icon size={large ? 18 : 14} strokeWidth={2.5} aria-hidden="true" className="badge-icon" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority, large = false }: { priority: Priority; large?: boolean }) {
  const Icon = PRIORITY_ICONS[priority];
  return (
    <span className={`badge badge-priority${large ? " badge-lg" : ""}`} data-priority={priority}>
      <Icon size={large ? 18 : 14} strokeWidth={2.5} aria-hidden="true" className="badge-icon" />
      {PRIORITY_META[priority].label}
      <span className="visually-hidden"> priority</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="badge badge-status" data-status={status}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_META[status].label}
    </span>
  );
}

export function ProviderBadge({ triagedBy, latencyMs }: { triagedBy: string; latencyMs?: number | null }) {
  const info = describeProvider(triagedBy);
  const Icon = info.icon;
  return (
    <span className="provider" data-tone={info.tone} title={info.explanation}>
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      <code>{triagedBy}</code>
      {latencyMs !== undefined && latencyMs !== null && <span className="provider-ms">{formatMs(latencyMs)}</span>}
    </span>
  );
}
