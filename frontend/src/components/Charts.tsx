import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import type { TriageOutcome } from "../api/client";
import { formatDateTime, formatMs, formatPercent } from "../lib/format";

/**
 * Small hand-built charts. Every mark is keyboard-focusable with a tooltip, every chart has a legend or
 * direct labels, and every chart has a table twin - colour never carries meaning on its own.
 */

export interface Datum {
  key: string;
  label: string;
  value: number;
  /** data-* attribute that assigns the colour token, e.g. ["category", "water"] */
  tone: [string, string];
  icon?: ReactNode;
}

function toneAttr([name, value]: [string, string]) {
  return { [`data-${name}`]: value };
}

export function TableView({ caption, rows, total }: { caption: string; rows: Datum[]; total: number }) {
  return (
    <details className="table-view">
      <summary>View as table</summary>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Value</th>
            <th scope="col">Count</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
              <td>{formatPercent(row.value, total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Horizontal bars, directly labelled. */
export function BarList({ data, total }: { data: Datum[]; total: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="bar-list">
      {data.map((d) => (
        <li key={d.key} className="bar-item" {...toneAttr(d.tone)}>
          <span className="bar-label">
            {d.icon}
            {d.label}
          </span>
          <span
            className="bar-track mark"
            tabIndex={0}
            aria-label={`${d.label}: ${d.value} (${formatPercent(d.value, total)})`}
          >
            <span className="bar-fill" style={{ width: d.value > 0 ? `max(6px, ${(d.value / max) * 100}%)` : "0" }} />
            <span className="tip" role="tooltip">
              <strong>{d.label}</strong> {d.value} · {formatPercent(d.value, total)}
            </span>
          </span>
          <span className="bar-value">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole ring for three or so segments, with a legend carrying the numbers. */
export function Donut({ data, total, centerLabel }: { data: Datum[]; total: number; centerLabel: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 && data.filter((d) => d.value > 0).length > 1 ? 2.5 : 0;
  let offset = 0;

  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" className="donut-svg" role="img" aria-label={`${centerLabel}: ${total}`}>
        <circle className="donut-track" cx="60" cy="60" r={radius} />
        {total > 0 &&
          data.map((d) => {
            const length = (d.value / total) * circumference;
            const visible = Math.max(0, length - gap);
            const segment = (
              <circle
                key={d.key}
                className="donut-seg"
                {...toneAttr(d.tone)}
                cx="60"
                cy="60"
                r={radius}
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.value} (${formatPercent(d.value, total)})`}</title>
              </circle>
            );
            offset += length;
            return segment;
          })}
        <text x="60" y="58" className="donut-total">
          {total}
        </text>
        <text x="60" y="76" className="donut-caption">
          {centerLabel}
        </text>
      </svg>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.key} {...toneAttr(d.tone)}>
            <span className="swatch" aria-hidden="true" />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">
              {d.value} <small>{formatPercent(d.value, total)}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A single 100% bar split into segments, with a legend. */
export function StackedBar({ data, total }: { data: Datum[]; total: number }) {
  return (
    <div className="stacked">
      <div className="stacked-bar">
        {total === 0 && <span className="stacked-empty">No complaints yet</span>}
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d) => (
              <span
                key={d.key}
                className="stacked-seg mark"
                {...toneAttr(d.tone)}
                style={{ flexGrow: d.value }}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value} (${formatPercent(d.value, total)})`}
              >
                <span className="tip" role="tooltip">
                  <strong>{d.label}</strong> {d.value} · {formatPercent(d.value, total)}
                </span>
              </span>
            ))}
      </div>
      <ul className="legend legend-inline">
        {data.map((d) => (
          <li key={d.key} {...toneAttr(d.tone)}>
            <span className="swatch" aria-hidden="true" />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The last triage outcomes as vertical bars, oldest on the left. */
export function LatencyStrip({ outcomes }: { outcomes: TriageOutcome[] }) {
  const ordered = [...outcomes].reverse();
  const max = Math.max(1, ...ordered.map((o) => o.latency_ms));

  if (ordered.length === 0) {
    return <p className="empty-note">No triage outcomes recorded yet. Submit a complaint to see one here.</p>;
  }

  return (
    <div className="latency">
      <div className="latency-plot">
        <span className="latency-axis" aria-hidden="true">
          {formatMs(max)}
        </span>
        <div className="latency-bars">
          {ordered.map((o, i) => (
            <span
              key={`${o.complaint_id ?? "none"}-${o.created_at}-${i}`}
              className="latency-bar mark"
              data-fallback={o.fallback ? "yes" : "no"}
              tabIndex={0}
              aria-label={`${o.provider}, ${formatMs(o.latency_ms)}${o.fallback ? ", fell back to rules" : ""}`}
            >
              <span className="latency-fill" style={{ height: `${Math.max(4, (o.latency_ms / max) * 100)}%` }} />
              <span className="tip" role="tooltip">
                <strong>{o.provider}</strong> {formatMs(o.latency_ms)}
                {o.fallback && <em> · fallback{o.error_class ? ` (${o.error_class})` : ""}</em>}
                <br />
                {formatDateTime(o.created_at)}
              </span>
            </span>
          ))}
        </div>
      </div>
      <ul className="legend legend-inline">
        <li data-fallback="no">
          <span className="swatch" aria-hidden="true" />
          <span className="legend-label">Triaged by provider</span>
        </li>
        <li data-fallback="yes">
          <span className="swatch" aria-hidden="true" />
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="legend-label">Fell back to rules</span>
        </li>
      </ul>
      <details className="table-view">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Provider</th>
              <th scope="col">Latency</th>
              <th scope="col">Fallback</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o, i) => (
              <tr key={`${o.created_at}-${i}`}>
                <td>{formatDateTime(o.created_at)}</td>
                <td>
                  <code>{o.provider}</code>
                </td>
                <td>{formatMs(o.latency_ms)}</td>
                <td>{o.fallback ? `yes${o.error_class ? ` (${o.error_class})` : ""}` : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
