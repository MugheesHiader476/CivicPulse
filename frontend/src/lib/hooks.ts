import { useCallback, useEffect, useState } from "react";

/** Current time, refreshed on an interval - for "5 minutes ago" labels. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Milliseconds since the component mounted, ticking every `tickMs`. */
export function useElapsed(tickMs = 100): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - started), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return elapsed;
}

/** A countdown lock driven by a server's Retry-After, e.g. after HTTP 429. */
export function useRetryLock(): { secondsLeft: number; lock: (seconds: number) => void } {
  const [until, setUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const lock = useCallback((seconds: number) => {
    const safe = Math.max(0, Math.ceil(seconds));
    setUntil(safe > 0 ? Date.now() + safe * 1000 : null);
    setSecondsLeft(safe);
  }, []);

  useEffect(() => {
    if (until === null) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setUntil(null);
    }, 250);
    return () => window.clearInterval(id);
  }, [until]);

  return { secondsLeft, lock };
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · CivicPulse` : "CivicPulse";
  }, [title]);
}
