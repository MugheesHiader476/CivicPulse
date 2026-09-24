import { useElapsed } from "../lib/hooks";
import { PulseTrace } from "./Pulse";

/**
 * Honest loading state. We cannot see what the server is doing, so there is no fake progress bar:
 * just a real elapsed timer and what the system is documented to do at each point in time.
 */
function phaseFor(seconds: number): { title: string; note: string } {
  if (seconds < 4) {
    return {
      title: "Reading your complaint…",
      note: "The server validates it, asks the AI for a category, priority and one-line summary, then saves it. This usually takes a few seconds.",
    };
  }
  if (seconds < 11) {
    return {
      title: "Still triaging…",
      note: "The AI provider is slower than usual. Each AI call is capped at 10 seconds.",
    };
  }
  return {
    title: "Waiting on the AI provider…",
    note: "It did not answer in time, so the server retries once and then uses its rule-based fallback. Your complaint will not be lost.",
  };
}

export function TriageProgress({ excerpt }: { excerpt: string }) {
  const elapsed = useElapsed(100);
  const seconds = elapsed / 1000;
  const phase = phaseFor(seconds);

  return (
    <section className="card triage-progress" aria-labelledby="triage-progress-title">
      <div className="triage-progress-head">
        <h2 id="triage-progress-title" role="status" aria-live="polite">
          {phase.title}
        </h2>
        <span className="elapsed" aria-hidden="true">
          {seconds.toFixed(1)}
          <small>s</small>
        </span>
      </div>
      <PulseTrace />
      <p className="triage-progress-note">{phase.note}</p>
      <blockquote className="excerpt">{excerpt}</blockquote>
    </section>
  );
}
