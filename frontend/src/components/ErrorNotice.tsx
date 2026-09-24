import { RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { ApiError } from "../api/http";

/** Shows a failed request with the server's own words and the id to quote to an operator. */
export function ErrorNotice({ error, title, onRetry }: { error: unknown; title?: string; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const offline = apiError?.kind === "network" || apiError?.kind === "timeout";
  const Icon = offline ? WifiOff : ServerCrash;
  const message = apiError?.detail ?? (error instanceof Error ? error.message : "Unexpected error.");

  return (
    <div className="notice notice-error" role="alert">
      <Icon size={22} aria-hidden="true" className="notice-icon" />
      <div className="notice-body">
        <strong>
          {title ?? "Request failed"}
          {apiError && apiError.status > 0 && <span className="notice-status"> · HTTP {apiError.status}</span>}
        </strong>
        <p className="verbatim">{message}</p>
        {apiError && (
          <p className="notice-meta">
            Request id <code>{apiError.requestId}</code>
          </p>
        )}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
