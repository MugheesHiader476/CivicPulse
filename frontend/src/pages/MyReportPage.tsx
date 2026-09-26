import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, Clock, MapPin, RefreshCw, SearchX } from "lucide-react";
import { getMyComplaint } from "../api/client";
import { ApiError } from "../api/http";
import { CategoryBadge, PriorityBadge, StatusBadge } from "../components/Badges";
import { CopyButton } from "../components/CopyButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { formatDateTime, formatRelative, shortId } from "../lib/format";
import { useDocumentTitle, useNow } from "../lib/hooks";
import { queryKeys } from "../lib/queries";

export function MyReportPage() {
  const { id = "" } = useParams();
  useDocumentTitle(`My report ${shortId(id)}`);
  const now = useNow(30_000);
  const report = useQuery({
    queryKey: queryKeys.myComplaint(id),
    queryFn: ({ signal }) => getMyComplaint(id, signal),
    refetchInterval: 30_000,
  });
  const back = <Link className="back-link" to="/my-reports"><ArrowLeft size={18} aria-hidden="true" /> Back to my reports</Link>;

  if (report.isPending) return <div className="page">{back}<div className="card skeleton-detail" aria-busy="true" aria-label="Loading report" /></div>;
  if (report.error instanceof ApiError && report.error.kind === "not_found") {
    return <div className="page">{back}<section className="card empty"><SearchX size={40} aria-hidden="true" /><h1>Report not found</h1><p>This report is not available in your account.</p></section></div>;
  }
  if (!report.data) return <div className="page">{back}<ErrorNotice error={report.error} title="Could not load your report" onRetry={() => void report.refetch()} /></div>;

  const complaint = report.data;
  return (
    <div className="page">
      {back}
      <article className="card detail" data-priority={complaint.priority}>
        <div className="badge-row">
          <PriorityBadge priority={complaint.priority} large />
          <CategoryBadge category={complaint.category} large />
          <StatusBadge status={complaint.status} />
        </div>
        <h1 className="detail-title">{complaint.ai_summary ?? "Your report"}</h1>
        <p className="muted">The city team updates the status as your report moves through the workflow.</p>
        <section className="detail-text" aria-label="Your complaint">
          <p className="eyebrow">Your report</p>
          <blockquote>{complaint.text}</blockquote>
        </section>
        <dl className="facts facts-grid">
          <div><dt>Current status</dt><dd><StatusBadge status={complaint.status} /></dd></div>
          <div><dt>Location</dt><dd><MapPin size={14} aria-hidden="true" /> {complaint.location}</dd></div>
          <div><dt>Submitted</dt><dd><Clock size={14} aria-hidden="true" /> {formatDateTime(complaint.created_at)}</dd></div>
          <div><dt>Last updated</dt><dd title={formatDateTime(complaint.updated_at)}>{formatRelative(complaint.updated_at, now)}</dd></div>
          <div className="facts-wide"><dt>Reference</dt><dd className="mono-row"><code>{complaint.id}</code><CopyButton value={complaint.id} label="Copy reference number" /></dd></div>
        </dl>
        <button type="button" className="btn btn-ghost" onClick={() => void report.refetch()} disabled={report.isFetching}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh status
        </button>
      </article>
    </div>
  );
}
