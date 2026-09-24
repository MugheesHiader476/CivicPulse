import { apiRequest } from "./http";
import {
  categoryValues,
  pathsApiStatsGetResponses200HeadersXCacheValues,
  priorityValues,
  statusValues,
  type components,
  type paths,
} from "./schema.gen";

/**
 * Typed API client. Every type below is derived from schema.gen.ts, which `npm run gen:api`
 * generates from the backend's OpenAPI document. If the backend contract changes and the snapshot is
 * regenerated, `tsc --noEmit` fails wherever this client or the UI no longer matches it.
 */

type Schemas = components["schemas"];
export type Category = Schemas["Category"];
export type Priority = Schemas["Priority"];
export type Status = Schemas["Status"];
export type Complaint = Schemas["Complaint"];
export type ComplaintCreate = Schemas["ComplaintCreate"];
export type ComplaintPage = Schemas["ComplaintPage"];
export type Stats = Schemas["Stats"];
export type ProvidersMeta = Schemas["ProvidersMeta"];
export type TriageOutcome = Schemas["TriageOutcome"];
export type ListComplaintsQuery = NonNullable<paths["/api/complaints"]["get"]["parameters"]["query"]>;

/** Enum values as runtime arrays, generated from the schema - never hand-maintained. */
export const CATEGORIES: readonly Category[] = categoryValues;
export const PRIORITIES: readonly Priority[] = priorityValues;
export const STATUSES: readonly Status[] = statusValues;

export type CacheStatus = (typeof pathsApiStatsGetResponses200HeadersXCacheValues)[number] | "unknown";

// `satisfies` makes the compiler check each path against the generated `paths` interface.
const PATHS = {
  complaints: "/api/complaints",
  complaint: "/api/complaints/{id}",
  complaintStatus: "/api/complaints/{id}/status",
  stats: "/api/stats",
  providers: "/api/meta/providers",
} as const satisfies Record<string, keyof paths>;

function withId(path: (typeof PATHS)["complaint" | "complaintStatus"], id: string): string {
  return path.replace("{id}", encodeURIComponent(id));
}

/** AI triage can take a while: the server allows 10 s per LLM call plus one retry before falling back. */
export const SUBMIT_TIMEOUT_MS = 45_000;

export interface CreatedComplaint {
  complaint: Complaint;
  elapsedMs: number;
  requestId: string;
}

export async function createComplaint(body: ComplaintCreate): Promise<CreatedComplaint> {
  const res = await apiRequest<Complaint>(PATHS.complaints, {
    method: "POST",
    body,
    timeoutMs: SUBMIT_TIMEOUT_MS,
  });
  return { complaint: res.data, elapsedMs: res.elapsedMs, requestId: res.requestId };
}

export async function listComplaints(query: ListComplaintsQuery, signal?: AbortSignal): Promise<ComplaintPage> {
  const res = await apiRequest<ComplaintPage>(PATHS.complaints, { query, signal });
  return res.data;
}

export async function getComplaint(id: string, signal?: AbortSignal): Promise<Complaint> {
  const res = await apiRequest<Complaint>(withId(PATHS.complaint, id), { signal });
  return res.data;
}

export async function updateComplaintStatus(id: string, status: Status): Promise<Complaint> {
  const body: Schemas["StatusUpdate"] = { status };
  const res = await apiRequest<Complaint>(withId(PATHS.complaintStatus, id), { method: "PATCH", body });
  return res.data;
}

export interface StatsResult {
  stats: Stats;
  cache: CacheStatus;
  elapsedMs: number;
  fetchedAt: number;
}

export function parseCacheHeader(value: string | null): CacheStatus {
  const normalised = value?.trim().toUpperCase();
  return pathsApiStatsGetResponses200HeadersXCacheValues.find((v) => v === normalised) ?? "unknown";
}

export async function getStats(signal?: AbortSignal): Promise<StatsResult> {
  const res = await apiRequest<Stats>(PATHS.stats, { signal });
  return {
    stats: res.data,
    cache: parseCacheHeader(res.headers.get("X-Cache")),
    elapsedMs: res.elapsedMs,
    fetchedAt: Date.now(),
  };
}

export async function getProviders(signal?: AbortSignal): Promise<ProvidersMeta> {
  const res = await apiRequest<ProvidersMeta>(PATHS.providers, { signal });
  return res.data;
}

/** Narrowing helpers for untrusted strings such as URL search params. */
export function asCategory(value: string | null): Category | null {
  return CATEGORIES.find((c) => c === value) ?? null;
}
export function asPriority(value: string | null): Priority | null {
  return PRIORITIES.find((p) => p === value) ?? null;
}
export function asStatus(value: string | null): Status | null {
  return STATUSES.find((s) => s === value) ?? null;
}
