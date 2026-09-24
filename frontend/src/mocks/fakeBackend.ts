import type { Category, Complaint, Priority, Stats, Status, TriageOutcome } from "../api/client";
import { SEED } from "./seed";

/**
 * DEV-ONLY stand-in for the FastAPI backend, used by `npm run dev:mock`.
 * It imitates the HTTP contract (status codes, headers, error bodies) so the UI can be explored
 * without the real stack. The rules in this file belong to the pretend server - the application
 * code never imports them (enforced by ESLint) and production builds never include this file.
 */

const CATEGORY_KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  water: ["water", "pani", "pipe", "leak", "tanker", "supply", "tap", "nalka", "hydrant"],
  electricity: ["bijli", "electric", "transformer", "wire", "loadshedding", "voltage", "meter", "spark", "current", "pole"],
  sanitation: ["kachra", "garbage", "gutter", "sewer", "sewerage", "drain", "nala", "badbu", "smell", "toilet", "trash"],
  roads: ["road", "sarak", "khadda", "pothole", "footpath", "speed breaker", "manhole", "bajri", "boulevard"],
  streetlights: ["street light", "streetlight", "andhera", "dark", "lamp", "light"],
};
const HIGH_WORDS = ["flood", "danger", "khatarnak", "blast", "spark", "live wire", "bitten", "sick", "fire", "aag", "injur", "accident", "hospital", "ambulance", "since fajr", "doob"];
const LOW_WORDS = ["minor", "when possible", "small", "flicker", "cosmetic"];
const INJECTION = /(ignore|disregard|forget)\b[^.]*\b(instruction|prompt|rules)[^.]*\.?/gi;

const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;
const STATS_TTL_MS = 30_000;

const TRANSITIONS: Record<Status, Status[]> = {
  open: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

interface MockRequest {
  method: string;
  url: URL;
  body: string | null;
  signal: AbortSignal | null;
  requestId: string;
}

function uuid(seed: number): string {
  // mulberry32: small deterministic PRNG, so seeded ids are stable across reloads
  let t = seed >>> 0;
  const next = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) % 16;
  };
  const hex = Array.from({ length: 32 }, () => next().toString(16)).join("");
  const variant = ((next() & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function sleep(ms: number, signal: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function json(status: number, body: unknown, requestId: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "X-Request-ID": requestId, ...headers },
  });
}

function keywordTriage(text: string): { category: Category; priority: Priority } {
  const lower = text.toLowerCase();
  let best: Category = "other";
  let bestScore = 0;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    const score = words.reduce((sum, w) => sum + (lower.includes(w) ? w.length : 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  const priority: Priority = HIGH_WORDS.some((w) => lower.includes(w))
    ? "high"
    : LOW_WORDS.some((w) => lower.includes(w))
      ? "low"
      : "normal";
  return { category: best, priority };
}

function summarise(text: string, location: string, category: Category): string {
  const cleaned = text.replace(INJECTION, "").replace(/^\s*(also|and)\s*:?\s*/i, "").trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s/)[0] ?? cleaned;
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  const summary = `${label} issue at ${location}: ${firstSentence}`;
  return summary.length > 140 ? `${summary.slice(0, 139).trimEnd()}…` : summary;
}

export class FakeBackend {
  private complaints: Complaint[];
  private outcomes: TriageOutcome[];
  private statsCache: { value: Stats; expires: number } | null = null;
  private rateWindow = { start: 0, count: 0 };
  private triageCache = new Map<number, { category: Category; priority: Priority; summary: string; provider: string }>();
  private submissions = 0;

  constructor(now = Date.now()) {
    this.complaints = SEED.map((row, i) => {
      const created = new Date(now - row.minutesAgo * 60_000).toISOString();
      const updatedOffset = row.status === "open" ? 0 : Math.min(row.minutesAgo, 30) * 60_000;
      return {
        id: uuid(i + 1),
        text: row.text,
        location: row.location,
        reporter_contact: row.contact ?? null,
        category: row.category,
        priority: row.priority,
        status: row.status,
        ai_summary: row.summary,
        triaged_by: row.triagedBy,
        triage_latency_ms: row.latencyMs,
        created_at: created,
        updated_at: new Date(Date.parse(created) + updatedOffset).toISOString(),
      };
    }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

    this.outcomes = this.complaints.slice(0, 20).map((c) => ({
      complaint_id: c.id,
      provider: c.triaged_by,
      latency_ms: c.triage_latency_ms ?? 0,
      fallback: c.triaged_by === "rules:fallback",
      error_class: c.triaged_by === "rules:fallback" ? "TimeoutError" : null,
      created_at: c.created_at,
    }));
  }

  async handle(req: MockRequest): Promise<Response> {
    const { method, url, requestId } = req;
    const path = url.pathname.replace(/\/+$/, "");
    const detail = path.match(/^\/api\/complaints\/([^/]+)$/);
    const statusPath = path.match(/^\/api\/complaints\/([^/]+)\/status$/);

    if (path === "/api/complaints" && method === "GET") return this.list(req);
    if (path === "/api/complaints" && method === "POST") return this.create(req);
    if (detail && method === "GET") return this.get(decodeURIComponent(detail[1] ?? ""), req);
    if (statusPath && method === "PATCH") return this.patchStatus(decodeURIComponent(statusPath[1] ?? ""), req);
    if (path === "/api/stats" && method === "GET") return this.stats(req);
    if (path === "/api/meta/providers" && method === "GET") {
      await sleep(120, req.signal);
      return json(200, { active_provider: "llm:groq", recent: this.outcomes.slice(0, 20) }, requestId);
    }
    return json(404, { detail: "Not Found" }, requestId);
  }

  private async list(req: MockRequest): Promise<Response> {
    await sleep(180 + Math.random() * 220, req.signal);
    const q = req.url.searchParams;
    const page = Number(q.get("page") ?? "1");
    const pageSize = Number(q.get("page_size") ?? "20");
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return json(400, {
        detail: "Invalid pagination parameters",
        errors: [{ field: "page_size", message: "page must be >= 1 and page_size between 1 and 100" }],
      }, req.requestId);
    }
    const filtered = this.complaints.filter(
      (c) =>
        (!q.get("category") || c.category === q.get("category")) &&
        (!q.get("priority") || c.priority === q.get("priority")) &&
        (!q.get("status") || c.status === q.get("status")),
    );
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    return json(200, { items, total: filtered.length, page, page_size: pageSize }, req.requestId);
  }

  private async get(id: string, req: MockRequest): Promise<Response> {
    await sleep(150, req.signal);
    const complaint = this.complaints.find((c) => c.id === id);
    return complaint
      ? json(200, complaint, req.requestId)
      : json(404, { detail: `Complaint ${id} not found` }, req.requestId);
  }

  private async create(req: MockRequest): Promise<Response> {
    const now = Date.now();
    if (now - this.rateWindow.start >= RATE_WINDOW_MS) this.rateWindow = { start: now, count: 0 };
    this.rateWindow.count += 1;
    if (this.rateWindow.count > RATE_LIMIT) {
      const retryAfter = Math.ceil((this.rateWindow.start + RATE_WINDOW_MS - now) / 1000);
      await sleep(80, req.signal);
      return json(429, { detail: `Rate limit exceeded: ${RATE_LIMIT} complaints per minute per client.` }, req.requestId, {
        "Retry-After": String(retryAfter),
      });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(req.body ?? "{}") as Record<string, unknown>;
    } catch {
      return json(400, { detail: "Body is not valid JSON", errors: [] }, req.requestId);
    }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const contact = typeof body.reporter_contact === "string" ? body.reporter_contact.trim() : null;
    const errors: { field: string; message: string }[] = [];
    if (text.length < 10 || text.length > 2000) errors.push({ field: "text", message: "Text must be 10-2000 characters." });
    if (location.length < 3 || location.length > 200) errors.push({ field: "location", message: "Location must be 3-200 characters." });
    if (contact && contact.length > 200) errors.push({ field: "reporter_contact", message: "Contact must be at most 200 characters." });
    if (errors.length) return json(400, { detail: "Validation failed", errors }, req.requestId);

    // Content-hash cache: duplicate reports cost one "inference".
    const key = hash(`${text.toLowerCase()}|${location.toLowerCase()}`);
    const started = performance.now();
    let result = this.triageCache.get(key);
    let fallback = false;
    if (result) {
      await sleep(60, req.signal);
    } else {
      this.submissions += 1;
      fallback = this.submissions % 5 === 0; // every fifth fresh complaint simulates a provider timeout
      await sleep(fallback ? 3200 : 900 + Math.random() * 1600, req.signal);
      const triage = keywordTriage(text);
      result = {
        ...triage,
        provider: fallback ? "rules:fallback" : "llm:groq",
        summary: fallback ? (text.length > 140 ? `${text.slice(0, 139)}…` : text) : summarise(text, location, triage.category),
      };
      this.triageCache.set(key, result);
    }
    const latency = Math.round(performance.now() - started);

    const stamp = new Date().toISOString();
    const complaint: Complaint = {
      id: uuid(this.complaints.length + 1000 + Math.floor(Math.random() * 1e6)),
      text,
      location,
      reporter_contact: contact || null,
      category: result.category,
      priority: result.priority,
      status: "open",
      ai_summary: result.summary,
      triaged_by: result.provider,
      triage_latency_ms: latency,
      created_at: stamp,
      updated_at: stamp,
    };
    this.complaints.unshift(complaint);
    this.outcomes.unshift({
      complaint_id: complaint.id,
      provider: result.provider,
      latency_ms: latency,
      fallback,
      error_class: fallback ? "TimeoutError" : null,
      created_at: stamp,
    });
    this.outcomes = this.outcomes.slice(0, 20);
    this.statsCache = null; // invalidate on write
    return json(201, complaint, req.requestId);
  }

  private async patchStatus(id: string, req: MockRequest): Promise<Response> {
    await sleep(250, req.signal);
    const complaint = this.complaints.find((c) => c.id === id);
    if (!complaint) return json(404, { detail: `Complaint ${id} not found` }, req.requestId);
    let target: unknown;
    try {
      target = (JSON.parse(req.body ?? "{}") as { status?: unknown }).status;
    } catch {
      target = undefined;
    }
    if (typeof target !== "string" || !(target in TRANSITIONS)) {
      return json(400, { detail: "Validation failed", errors: [{ field: "status", message: "Unknown status." }] }, req.requestId);
    }
    const to = target as Status;
    const allowed = TRANSITIONS[complaint.status];
    if (!allowed.includes(to)) {
      return json(409, {
        detail: `Invalid status transition: ${complaint.status} -> ${to}. Allowed from ${complaint.status}: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}.`,
      }, req.requestId);
    }
    complaint.status = to;
    complaint.updated_at = new Date().toISOString();
    this.statsCache = null;
    return json(200, complaint, req.requestId);
  }

  private async stats(req: MockRequest): Promise<Response> {
    const now = Date.now();
    if (this.statsCache && this.statsCache.expires > now) {
      await sleep(18, req.signal);
      return json(200, this.statsCache.value, req.requestId, { "X-Cache": "HIT" });
    }
    await sleep(260 + Math.random() * 160, req.signal);
    const tally = <K extends string>(pick: (c: Complaint) => K) =>
      this.complaints.reduce<Record<string, number>>((acc, c) => {
        const k = pick(c);
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    const value: Stats = {
      total: this.complaints.length,
      by_category: tally((c) => c.category),
      by_priority: tally((c) => c.priority),
      by_status: tally((c) => c.status),
    };
    this.statsCache = { value, expires: now + STATS_TTL_MS };
    return json(200, value, req.requestId, { "X-Cache": "MISS" });
  }
}
