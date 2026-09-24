import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Clock, MapPin } from "lucide-react";
import type { Complaint } from "../api/client";
import { formatDateTime, formatRelative } from "../lib/format";
import { CategoryBadge, PriorityBadge, ProviderBadge, StatusBadge } from "./Badges";
import { StatusControl } from "./StatusControl";

export function ComplaintRow({ complaint, now }: { complaint: Complaint; now: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `manage-${complaint.id}`;
  const title = complaint.ai_summary ?? complaint.text;

  return (
    <article className="complaint-row" data-priority={complaint.priority} aria-label={title}>
      <div className="complaint-main">
        <div className="badge-row">
          <PriorityBadge priority={complaint.priority} />
          <CategoryBadge category={complaint.category} />
          <StatusBadge status={complaint.status} />
        </div>
        <h3 className="complaint-title">
          <Link to={`/complaints/${complaint.id}`}>{title}</Link>
        </h3>
        {complaint.ai_summary && <p className="complaint-text">{complaint.text}</p>}
        <p className="complaint-meta">
          <span>
            <MapPin size={14} aria-hidden="true" /> {complaint.location}
          </span>
          <span title={formatDateTime(complaint.created_at)}>
            <Clock size={14} aria-hidden="true" />{" "}
            <time dateTime={complaint.created_at}>{formatRelative(complaint.created_at, now)}</time>
          </span>
          <ProviderBadge triagedBy={complaint.triaged_by} latencyMs={complaint.triage_latency_ms} />
        </p>
      </div>

      <div className="complaint-side">
        <button
          type="button"
          className="btn btn-ghost btn-sm manage-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Manage <ChevronDown size={16} aria-hidden="true" className="chevron" />
        </button>
      </div>

      {open && (
        <div className="complaint-manage" id={panelId}>
          <StatusControl complaint={complaint} compact />
        </div>
      )}
    </article>
  );
}
