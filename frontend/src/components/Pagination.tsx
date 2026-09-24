import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "../lib/pagination";

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pages">
      <button
        type="button"
        className="page-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="page-btn"
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="page-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
