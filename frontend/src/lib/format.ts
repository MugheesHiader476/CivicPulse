const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatRelative(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "unknown time";
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return absolute.format(time);
}

export function formatDateTime(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : absolute.format(time);
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "n/a";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  const value = (part / whole) * 100;
  return `${value < 10 && value > 0 ? value.toFixed(1) : Math.round(value)}%`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
