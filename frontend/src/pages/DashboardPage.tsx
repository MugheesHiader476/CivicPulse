import { useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Inbox, LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";
import { asCategory, asPriority, asStatus, listComplaints, type ListComplaintsQuery } from "../api/client";
import { ComplaintRow } from "../components/ComplaintRow";
import { ErrorNotice } from "../components/ErrorNotice";
import { FilterBar, type Filters } from "../components/FilterBar";
import { Pagination } from "../components/Pagination";
import { runtimeConfig } from "../config";
import { formatRelative } from "../lib/format";
import { useDocumentTitle, useNow } from "../lib/hooks";
import { queryKeys } from "../lib/queries";

const PAGE_SIZES = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

function positiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

export function DashboardPage() {
  useDocumentTitle("Operations dashboard");
  const [params, setParams] = useSearchParams();
  const [live, setLive] = useState(true);
  const now = useNow(30_000);

  const filters: Filters = {
    category: asCategory(params.get("category")),
    priority: asPriority(params.get("priority")),
    status: asStatus(params.get("status")),
  };
  const page = positiveInt(params.get("page"), 1);
  const requestedSize = positiveInt(params.get("page_size"), DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(100, requestedSize);

  const query: ListComplaintsQuery = { ...filters, page, page_size: pageSize };

  const list = useQuery({
    queryKey: queryKeys.complaintList(query),
    queryFn: ({ signal }) => listComplaints(query, signal),
    placeholderData: keepPreviousData,
    refetchInterval: live ? runtimeConfig.refreshSeconds * 1000 : false,
  });

  function setSearch(next: Filters & { page?: number; page_size?: number }) {
    const search = new URLSearchParams();
    if (next.category) search.set("category", next.category);
    if (next.priority) search.set("priority", next.priority);
    if (next.status) search.set("status", next.status);
    const nextPage = next.page ?? 1;
    const nextSize = next.page_size ?? pageSize;
    if (nextPage > 1) search.set("page", String(nextPage));
    if (nextSize !== DEFAULT_PAGE_SIZE) search.set("page_size", String(nextSize));
    setParams(search);
  }

  const data = list.data;
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const hasFilters = Boolean(filters.category || filters.priority || filters.status);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Complaint board</h1>
          <p className="lead">
            Every complaint, sorted by the AI and ready for action. Open one to move it through the workflow.
          </p>
        </div>
        <div className="page-tools">
          <button
            type="button"
            className={`live-toggle${live ? " is-live" : ""}`}
            aria-pressed={live}
            onClick={() => setLive((v) => !v)}
            title={`Auto-refresh every ${runtimeConfig.refreshSeconds} s`}
          >
            <span className="live-dot" aria-hidden="true" />
            {live ? "Live" : "Paused"}
            {live ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void list.refetch()}
            disabled={list.isFetching}
          >
            {list.isFetching ? (
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
            Refresh
          </button>
        </div>
      </header>

      <FilterBar filters={filters} onChange={(next) => setSearch(next)} />

      <div className="results-bar">
        <p aria-live="polite">
          {list.isPending ? (
            "Loading complaints…"
          ) : (
            <>
              Showing <strong>{first}</strong>–<strong>{last}</strong> of <strong>{total}</strong>
              {hasFilters ? " matching" : ""}
              {list.dataUpdatedAt > 0 && (
                <span className="muted"> · updated {formatRelative(new Date(list.dataUpdatedAt).toISOString(), now)}</span>
              )}
            </>
          )}
        </p>
        <label className="page-size">
          Per page
          <select
            value={pageSize}
            onChange={(e) => setSearch({ ...filters, page: 1, page_size: Number(e.target.value) })}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.isError && !data && <ErrorNotice error={list.error} title="Could not load complaints" onRetry={() => void list.refetch()} />}
      {list.isError && data && (
        <ErrorNotice error={list.error} title="Refresh failed - showing the last good data" onRetry={() => void list.refetch()} />
      )}

      {list.isPending && (
        <ul className="skeleton-list" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="skeleton-row" />
          ))}
        </ul>
      )}

      {data && data.items.length === 0 && (
        <div className="card empty">
          <Inbox size={40} aria-hidden="true" />
          <h2>{page > 1 ? "This page is empty" : "Nothing here"}</h2>
          <p>{hasFilters ? "No complaints match these filters." : "No complaints have been submitted yet."}</p>
          {page > 1 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setSearch({ ...filters, page: 1 })}>
              Back to page 1
            </button>
          ) : (
            hasFilters && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSearch({ category: null, priority: null, status: null })}
              >
                Clear filters
              </button>
            )
          )}
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className={`complaint-list${list.isPlaceholderData ? " is-stale" : ""}`} aria-busy={list.isFetching}>
          {data.items.map((complaint) => (
            <ComplaintRow key={complaint.id} complaint={complaint} now={now} />
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={(p) => setSearch({ ...filters, page: p })} />
    </div>
  );
}
