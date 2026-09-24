import { CircleHelp, Database, LoaderCircle, RefreshCw, Zap } from "lucide-react";
import type { CacheStatus } from "../api/client";
import { formatMs } from "../lib/format";
import type { CacheSample } from "../lib/queries";

const COPY: Record<CacheStatus, { title: string; body: string }> = {
  HIT: {
    title: "Cache HIT",
    body: "Served straight from Redis. These numbers were computed at most 30 seconds ago and not re-queried from Postgres.",
  },
  MISS: {
    title: "Cache MISS",
    body: "Computed fresh from Postgres, then stored in Redis for 30 seconds. A new complaint clears it, so it is never stale after a write.",
  },
  unknown: {
    title: "Cache state unknown",
    body: "The server did not send an X-Cache header with this response.",
  },
};

export function CachePanel({
  cache,
  elapsedMs,
  history,
  fetching,
  onRefetch,
}: {
  cache: CacheStatus;
  elapsedMs: number;
  history: CacheSample[];
  fetching: boolean;
  onRefetch: () => void;
}) {
  const Icon = cache === "HIT" ? Zap : cache === "MISS" ? Database : CircleHelp;
  const hits = history.filter((h) => h.cache === "HIT").length;

  return (
    <section className="card cache-panel" data-cache={cache} aria-labelledby="cache-title">
      <div className="cache-head">
        <span className="cache-icon" aria-hidden="true">
          <Icon size={30} strokeWidth={2.5} />
        </span>
        <div>
          <p className="eyebrow">
            Response header <code>X-Cache</code>
          </p>
          <h2 id="cache-title" data-testid="cache-state">
            {COPY[cache].title}
          </h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm cache-refetch" onClick={onRefetch} disabled={fetching}>
          {fetching ? (
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={16} aria-hidden="true" />
          )}
          Fetch again
        </button>
      </div>
      <p className="cache-body">{COPY[cache].body}</p>
      <p className="cache-ms">
        Round trip <strong>{formatMs(elapsedMs)}</strong>
      </p>

      <div className="cache-history">
        <p className="cache-history-label">
          This session: {hits} of {history.length} request{history.length === 1 ? "" : "s"} hit the cache
        </p>
        <ol className="cache-dots">
          {history.map((sample) => (
            <li
              key={sample.at}
              data-cache={sample.cache}
              title={`${sample.cache} · ${formatMs(sample.elapsedMs)} · ${new Date(sample.at).toLocaleTimeString()}`}
            >
              <span className="visually-hidden">
                {sample.cache} in {formatMs(sample.elapsedMs)}
              </span>
              <span aria-hidden="true">{sample.cache === "HIT" ? "H" : sample.cache === "MISS" ? "M" : "?"}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
