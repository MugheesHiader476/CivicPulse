import { Link, useParams } from "react-router";
import { ArrowLeft, Clock, MapPin, Phone, SearchX, Sparkles } from "lucide-react";
import { ApiError } from "../api/http";
import { CategoryBadge, PriorityBadge, ProviderBadge, StatusBadge } from "../components/Badges";
import { CopyButton } from "../components/CopyButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { StatusControl } from "../components/StatusControl";
import { formatDateTime, formatMs, formatRelative, shortId } from "../lib/format";
import { useDocumentTitle, useNow } from "../lib/hooks";
import { describeProvider } from "../lib/presentation";
import { useComplaint } from "../lib/queries";

export function ComplaintPage() {
  const { id = "" } = useParams();
  useDocumentTitle(`Complaint ${shortId(id)}`);
  const now = useNow(30_000);
  const { data: complaint, error, isPending, refetch } = useComplaint(id);

  const back = (
    <Link to="/dashboard" className="back-link">
      <ArrowLeft size={18} aria-hidden="true" /> Back to the board
    </Link>
  );

  if (isPending) {
    return (
      <div className="page">
        {back}
        <div className="card skeleton-detail" aria-busy="true" aria-label="Loading complaint" />
      </div>
    );
  }

  if (error instanceof ApiError && error.kind === "not_found") {
    return (
      <div className="page">
        {back}
        <section className="card empty">
          <SearchX size={40} aria-hidden="true" />
          <h1>Complaint not found</h1>
          <p className="verbatim">{error.detail}</p>
          <p className="muted">
            Reference <code>{id}</code>
          </p>
        </section>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="page">
        {back}
        <ErrorNotice error={error} title="Could not load this complaint" onRetry={() => void refetch()} />
      </div>
    );
  }

  const provider = describeProvider(complaint.triaged_by);

  return (
    <div className="page">
      {back}
      <article className="card detail" data-priority={complaint.priority}>
        <div className="badge-row">
          <PriorityBadge priority={complaint.priority} large />
          <CategoryBadge category={complaint.category} large />
          <StatusBadge status={complaint.status} />
        </div>
        <h1 className="detail-title">{complaint.ai_summary ?? "Complaint"}</h1>
        {complaint.ai_summary && (
          <p className="detail-ai-note">
            <Sparkles size={14} aria-hidden="true" /> AI summary · {provider.label}
          </p>
        )}

        <section className="detail-text" aria-label="Original complaint">
          <p className="eyebrow">In the citizen&rsquo;s words</p>
          <blockquote>{complaint.text}</blockquote>
        </section>

        <dl className="facts facts-grid">
          <div>
            <dt>Location</dt>
            <dd>
              <MapPin size={14} aria-hidden="true" /> {complaint.location}
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <Phone size={14} aria-hidden="true" /> {complaint.reporter_contact ?? <span className="muted">not given</span>}
            </dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd title={formatDateTime(complaint.created_at)}>
              <Clock size={14} aria-hidden="true" /> {formatRelative(complaint.created_at, now)}
              <span className="facts-note">{formatDateTime(complaint.created_at)}</span>
            </dd>
          </div>
          <div>
            <dt>Last update</dt>
            <dd>{formatRelative(complaint.updated_at, now)}</dd>
          </div>
          <div>
            <dt>Triaged by</dt>
            <dd>
              <ProviderBadge triagedBy={complaint.triaged_by} />
              <span className="facts-note">{provider.explanation}</span>
            </dd>
          </div>
          <div>
            <dt>Triage time</dt>
            <dd>{formatMs(complaint.triage_latency_ms)}</dd>
          </div>
          <div className="facts-wide">
            <dt>Reference</dt>
            <dd className="mono-row">
              <code>{complaint.id}</code>
              <CopyButton value={complaint.id} label="Copy reference number" />
            </dd>
          </div>
        </dl>

        <section className="detail-actions" aria-label="Workflow">
          <h2>Workflow</h2>
          <p className="muted">
            Request a new status. The server enforces which moves are allowed and explains any it refuses.
          </p>
          <StatusControl complaint={complaint} />
        </section>
      </article>
    </div>
  );
}
