import type { ReactNode } from "react";
import { Activity, CircleDot, Flame, Inbox, LifeBuoy, Timer } from "lucide-react";
import { CATEGORIES, PRIORITIES, STATUSES, type ProvidersMeta, type Stats } from "../api/client";
import { CachePanel } from "../components/CachePanel";
import { BarList, Donut, LatencyStrip, StackedBar, TableView, type Datum } from "../components/Charts";
import { ErrorNotice } from "../components/ErrorNotice";
import { formatMs, formatPercent } from "../lib/format";
import { useDocumentTitle } from "../lib/hooks";
import { CATEGORY_META, PRIORITY_META, STATUS_META, describeProvider } from "../lib/presentation";
import { useProviders, useStats } from "../lib/queries";

function count(record: Record<string, number> | undefined, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toData(stats: Stats) {
  const categories: Datum[] = CATEGORIES.map((c): Datum => {
    const Icon = CATEGORY_META[c].icon;
    return {
      key: c,
      label: CATEGORY_META[c].label,
      value: count(stats.by_category, c),
      tone: ["category", c],
      icon: <Icon size={16} strokeWidth={2.5} aria-hidden="true" className="bar-icon" />,
    };
  }).sort((a, b) => b.value - a.value);
  const priorities: Datum[] = PRIORITIES.map((p): Datum => ({
    key: p,
    label: PRIORITY_META[p].label,
    value: count(stats.by_priority, p),
    tone: ["priority", p],
  }));
  const statuses: Datum[] = STATUSES.map((s): Datum => ({
    key: s,
    label: STATUS_META[s].label,
    value: count(stats.by_status, s),
    tone: ["status", s],
  }));
  return { categories, priorities, statuses };
}

function PipelinePanel({ meta }: { meta: ProvidersMeta }) {
  const outcomes = meta.recent;
  const fallbacks = outcomes.filter((o) => o.fallback).length;
  const average = outcomes.length ? outcomes.reduce((sum, o) => sum + o.latency_ms, 0) / outcomes.length : null;
  const slowest = outcomes.length ? Math.max(...outcomes.map((o) => o.latency_ms)) : null;
  const provider = describeProvider(meta.active_provider);
  const Icon = provider.icon;

  return (
    <section className="card chart-card pipeline" aria-labelledby="pipeline-title">
      <div className="chart-head">
        <h2 id="pipeline-title">Triage pipeline</h2>
        <span className="provider provider-lg" data-tone={provider.tone} title={provider.explanation}>
          <Icon size={16} aria-hidden="true" /> Active: <code>{meta.active_provider}</code>
        </span>
      </div>
      <div className="mini-stats">
        <div>
          <Timer size={18} aria-hidden="true" />
          <span className="mini-label">Average</span>
          <strong>{formatMs(average)}</strong>
        </div>
        <div>
          <Activity size={18} aria-hidden="true" />
          <span className="mini-label">Slowest</span>
          <strong>{formatMs(slowest)}</strong>
        </div>
        <div data-warn={fallbacks > 0 ? "" : undefined}>
          <LifeBuoy size={18} aria-hidden="true" />
          <span className="mini-label">Fallbacks</span>
          <strong>
            {fallbacks} / {outcomes.length}
          </strong>
        </div>
      </div>
      <p className="chart-sub">Latency of the last {outcomes.length} triage calls, oldest on the left</p>
      <LatencyStrip outcomes={outcomes} />
    </section>
  );
}

export function StatsPage() {
  useDocumentTitle("City stats");
  const stats = useStats();
  const providers = useProviders();
  const result = stats.data;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Live aggregates</p>
          <h1>City pulse</h1>
          <p className="lead">What the city is complaining about right now, straight from the cached stats endpoint.</p>
        </div>
      </header>

      {stats.isError && !result && (
        <ErrorNotice error={stats.error} title="Could not load statistics" onRetry={() => void stats.refetch()} />
      )}
      {stats.isPending && <div className="card skeleton-detail" aria-busy="true" aria-label="Loading statistics" />}

      {result && (
        <StatsBody
          stats={result.stats}
          cachePanel={
            <CachePanel
              cache={result.cache}
              elapsedMs={result.elapsedMs}
              history={result.history}
              fetching={stats.isFetching}
              onRefetch={() => void stats.refetch()}
            />
          }
          refreshError={stats.isError ? stats.error : null}
        />
      )}

      {providers.data && <PipelinePanel meta={providers.data} />}
      {providers.isError && (
        <ErrorNotice error={providers.error} title="Could not load triage provider status" onRetry={() => void providers.refetch()} />
      )}
    </div>
  );
}

function StatsBody({
  stats,
  cachePanel,
  refreshError,
}: {
  stats: Stats;
  cachePanel: ReactNode;
  refreshError: Error | null;
}) {
  const { categories, priorities, statuses } = toData(stats);
  const total = stats.total;
  const open = count(stats.by_status, "open") + count(stats.by_status, "in_progress");
  const high = count(stats.by_priority, "high");
  const resolved = count(stats.by_status, "resolved");

  return (
    <>
      {refreshError && <ErrorNotice error={refreshError} title="Refresh failed - showing the last good numbers" />}
      <div className="stats-top">
        <div className="tiles">
          <div className="tile" data-tile="total">
            <Inbox size={22} aria-hidden="true" />
            <span className="tile-label">Total complaints</span>
            <strong className="tile-value">{total}</strong>
          </div>
          <div className="tile" data-tile="open">
            <CircleDot size={22} aria-hidden="true" />
            <span className="tile-label">Still being handled</span>
            <strong className="tile-value">{open}</strong>
          </div>
          <div className="tile" data-tile="high">
            <Flame size={22} aria-hidden="true" />
            <span className="tile-label">High priority</span>
            <strong className="tile-value">{high}</strong>
          </div>
          <div className="tile" data-tile="resolved">
            <LifeBuoy size={22} aria-hidden="true" />
            <span className="tile-label">Resolved share</span>
            <strong className="tile-value">
              {formatPercent(resolved, total)}
            </strong>
          </div>
        </div>
        {cachePanel}
      </div>

      <div className="chart-grid">
        <section className="card chart-card chart-wide" aria-labelledby="by-category">
          <div className="chart-head">
            <h2 id="by-category">By category</h2>
          </div>
          <BarList data={categories} total={total} />
          <TableView caption="Complaints by category" rows={categories} total={total} />
        </section>

        <section className="card chart-card" aria-labelledby="by-priority">
          <div className="chart-head">
            <h2 id="by-priority">By priority</h2>
          </div>
          <Donut data={priorities} total={total} centerLabel="complaints" />
          <TableView caption="Complaints by priority" rows={priorities} total={total} />
        </section>

        <section className="card chart-card" aria-labelledby="by-status">
          <div className="chart-head">
            <h2 id="by-status">By status</h2>
          </div>
          <StackedBar data={statuses} total={total} />
          <TableView caption="Complaints by status" rows={statuses} total={total} />
        </section>
      </div>
    </>
  );
}
