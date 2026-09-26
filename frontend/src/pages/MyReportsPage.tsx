import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Clock, Inbox, MapPin } from "lucide-react";
import { listMyComplaints } from "../api/client";
import { CategoryBadge, PriorityBadge, StatusBadge } from "../components/Badges";
import { ErrorNotice } from "../components/ErrorNotice";
import { Pagination } from "../components/Pagination";
import { formatRelative } from "../lib/format";
import { useDocumentTitle, useNow } from "../lib/hooks";
import { queryKeys } from "../lib/queries";

const PAGE_SIZE = 20;

export function MyReportsPage() {
  useDocumentTitle("My reports");
  const now = useNow(30_000);
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const reports = useQuery({
    queryKey: [...queryKeys.myComplaints, "list", page],
    queryFn: ({ signal }) => listMyComplaints(page, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const total = reports.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>My reports</h1>
          <p className="lead">Follow the status of complaints submitted from this account.</p>
        </div>
        <Link to="/" className="btn btn-primary">Report a problem</Link>
      </header>

      {reports.isError && <ErrorNotice error={reports.error} title="Could not load your reports" onRetry={() => void reports.refetch()} />}
      {reports.isPending && <div className="card" role="status">Loading your reports…</div>}
      {reports.data?.items.length === 0 && (
        <div className="card empty">
          <Inbox size={40} aria-hidden="true" />
          <h2>{page > 1 ? "This page is empty" : "No reports yet"}</h2>
          <p>{page > 1 ? "Go back to the first page." : "Reports you submit will appear here."}</p>
          <Link to={page > 1 ? "/my-reports" : "/"} className="btn btn-primary">
            {page > 1 ? "First page" : "Report a problem"}
          </Link>
        </div>
      )}
      {reports.data && reports.data.items.length > 0 && (
        <div className="complaint-list" aria-busy={reports.isFetching}>
          {reports.data.items.map((complaint) => (
            <article className="complaint-row" key={complaint.id} data-priority={complaint.priority}>
              <div className="complaint-main">
                <div className="badge-row">
                  <PriorityBadge priority={complaint.priority} />
                  <CategoryBadge category={complaint.category} />
                  <StatusBadge status={complaint.status} />
                </div>
                <h2 className="complaint-title">
                  <Link to={`/my-reports/${complaint.id}`}>{complaint.ai_summary ?? "Your report"}</Link>
                </h2>
                <p className="complaint-text">{complaint.text}</p>
                <p className="complaint-meta">
                  <span><MapPin size={14} aria-hidden="true" /> {complaint.location}</span>
                  <span><Clock size={14} aria-hidden="true" /> Updated {formatRelative(complaint.updated_at, now)}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })} />
    </div>
  );
}
