import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Ban, LoaderCircle } from "lucide-react";
import { STATUSES, updateComplaintStatus, type Complaint, type Status } from "../api/client";
import { ApiError } from "../api/http";
import { applyComplaintUpdate } from "../lib/queries";
import { STATUS_META } from "../lib/presentation";
import { useToast } from "../lib/toast";

/**
 * Lets an operator request any status. The frontend deliberately does not know which transitions are
 * valid - that table lives on the server. An invalid move comes back as 409 and its message is shown
 * exactly as the server wrote it.
 */
export function StatusControl({ complaint, compact = false }: { complaint: Complaint; compact?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [target, setTarget] = useState<Status | null>(null);

  const mutation = useMutation({
    mutationFn: ({ to }: { from: Status; to: Status }) => updateComplaintStatus(complaint.id, to),
    onSuccess: (updated, { from, to }) => {
      applyComplaintUpdate(queryClient, updated);
      toast(`Status changed: ${STATUS_META[from].label} → ${STATUS_META[to].label}`, "success");
    },
  });

  const error = mutation.error;
  const conflict = error instanceof ApiError && error.kind === "conflict" ? error : null;
  const options = STATUSES.filter((s) => s !== complaint.status);
  const headingId = `status-${complaint.id}`;

  return (
    <div className={`status-control${compact ? " is-compact" : ""}`}>
      <span className="status-control-label" id={headingId}>
        Move to
      </span>
      <div className="status-options" role="group" aria-labelledby={headingId}>
        {options.map((status) => {
          const busy = mutation.isPending && target === status;
          return (
            <button
              key={status}
              type="button"
              className="status-option"
              data-status={status}
              disabled={mutation.isPending}
              aria-busy={busy}
              onClick={() => {
                setTarget(status);
                mutation.mutate({ from: complaint.status, to: status });
              }}
            >
              {busy ? (
                <LoaderCircle size={14} className="spin" aria-hidden="true" />
              ) : (
                <ArrowRight size={14} aria-hidden="true" />
              )}
              {STATUS_META[status].label}
            </button>
          );
        })}
      </div>

      {conflict && (
        <div className="notice notice-conflict" role="alert">
          <Ban size={20} aria-hidden="true" className="notice-icon" />
          <div className="notice-body">
            <strong>Server refused this move · HTTP 409</strong>
            <p className="verbatim" data-testid="conflict-message">
              {conflict.detail}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={() => mutation.reset()} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      {error && !conflict && (
        <div className="notice notice-error" role="alert">
          <div className="notice-body">
            <strong>
              Could not change status
              {error instanceof ApiError && error.status > 0 ? ` · HTTP ${error.status}` : ""}
            </strong>
            <p className="verbatim">{error instanceof ApiError ? error.detail : error.message}</p>
          </div>
          <button type="button" className="icon-btn" onClick={() => mutation.reset()} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
