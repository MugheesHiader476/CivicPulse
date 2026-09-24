import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, LifeBuoy, MapPin, Plus, Sparkles } from "lucide-react";
import type { Complaint } from "../api/client";
import { formatMs } from "../lib/format";
import { CATEGORY_META, PRIORITY_META, describeProvider } from "../lib/presentation";
import { CategoryBadge, PriorityBadge, ProviderBadge, StatusBadge } from "./Badges";
import { CopyButton } from "./CopyButton";

export function TriageResult({
  complaint,
  roundTripMs,
  onReset,
}: {
  complaint: Complaint;
  roundTripMs: number;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const provider = describeProvider(complaint.triaged_by);
  const CategoryIcon = CATEGORY_META[complaint.category].icon;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="card result" data-priority={complaint.priority} aria-labelledby="result-title">
      <div className="stamp" aria-hidden="true">
        Triaged
        <small>{PRIORITY_META[complaint.priority].label}</small>
      </div>

      <p className="eyebrow">Complaint received</p>
      <h2 id="result-title" ref={headingRef} tabIndex={-1}>
        Thank you, it is on the board.
      </h2>

      <div className="result-grid">
        <div className="result-tile" data-category={complaint.category}>
          <span className="result-tile-icon" aria-hidden="true">
            <CategoryIcon size={28} strokeWidth={2.4} />
          </span>
          <span className="result-tile-label">Category</span>
          <CategoryBadge category={complaint.category} large />
        </div>
        <div className="result-tile" data-priority={complaint.priority}>
          <span className="result-tile-label">Priority</span>
          <PriorityBadge priority={complaint.priority} large />
        </div>
        <div className="result-tile">
          <span className="result-tile-label">Status</span>
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <figure className="summary">
        <figcaption>
          <Sparkles size={16} aria-hidden="true" /> AI summary
        </figcaption>
        <blockquote>{complaint.ai_summary ?? "No summary was produced for this complaint."}</blockquote>
      </figure>

      <dl className="facts">
        <div>
          <dt>Triaged by</dt>
          <dd>
            <ProviderBadge triagedBy={complaint.triaged_by} />
            <span className="facts-note">{provider.label}</span>
          </dd>
        </div>
        <div>
          <dt>Triage time</dt>
          <dd>
            {formatMs(complaint.triage_latency_ms)} <span className="facts-note">(round trip {formatMs(roundTripMs)})</span>
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            <MapPin size={14} aria-hidden="true" /> {complaint.location}
          </dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd className="mono-row">
            <code>{complaint.id}</code>
            <CopyButton value={complaint.id} label="Copy reference number" />
          </dd>
        </div>
      </dl>

      {provider.tone === "fallback" && (
        <p className="notice notice-fallback">
          <LifeBuoy size={20} aria-hidden="true" className="notice-icon" />
          <span>{provider.explanation}</span>
        </p>
      )}

      <div className="row-actions">
        <Link className="btn btn-primary" to={`/complaints/${complaint.id}`}>
          Open operator view <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <Plus size={18} aria-hidden="true" /> Report another
        </button>
      </div>
    </section>
  );
}
