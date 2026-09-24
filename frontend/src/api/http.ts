import { newRequestId } from "../lib/requestId";
import { getOperatorToken, isOperatorPath } from "./operator";

/**
 * Transport layer: one fetch wrapper that every endpoint goes through.
 * It adds a correlation id, enforces a timeout and turns every failure into an ApiError that keeps
 * the server's own message, so the UI can show it verbatim instead of a generic "error".
 */

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "validation"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server"
  | "http";

interface ApiErrorInit {
  kind: ApiErrorKind;
  status: number;
  detail: string;
  requestId: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number | null;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or 0 when no response arrived. */
  readonly status: number;
  /** The server's message, untouched, or a plain-language description of a transport failure. */
  readonly detail: string;
  readonly requestId: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly retryAfterSeconds: number | null;

  constructor(init: ApiErrorInit) {
    super(init.detail);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.detail = init.detail;
    this.requestId = init.requestId;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }

  /** Transient failures worth retrying for idempotent reads. Never 4xx: the request was wrong. */
  get isTransient(): boolean {
    return this.kind === "network" || this.kind === "timeout" || this.kind === "server";
  }
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  requestId: string;
  /** Round-trip time measured in the browser. */
  elapsedMs: number;
}

export type QueryValue = string | number | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 15_000;

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = "GET", query, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const requestId = newRequestId();
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  const headers: Record<string, string> = { Accept: "application/json", "X-Request-ID": requestId };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (isOperatorPath(path, method) && getOperatorToken()) headers.Authorization = `Bearer ${getOperatorToken()}`;

  const started = performance.now();
  let response: Response;
  let rawBody: string;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: "same-origin",
    });
    rawBody = await response.text();
  } catch (error) {
    if (timedOut) {
      throw new ApiError({
        kind: "timeout",
        status: 0,
        detail: `The server did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
        requestId,
      });
    }
    // The caller cancelled (navigation, newer query). Let the original AbortError through.
    if (signal?.aborted) throw error;
    throw new ApiError({
      kind: "network",
      status: 0,
      detail: "Could not reach the CivicPulse server. Check your connection and try again.",
      requestId,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  const elapsedMs = Math.round(performance.now() - started);
  const serverRequestId = response.headers.get("X-Request-ID") ?? requestId;
  const payload = parseJson(rawBody);

  if (!response.ok) {
    throw toApiError(response.status, payload, response.headers, serverRequestId);
  }
  if (payload === undefined) {
    throw new ApiError({
      kind: "server",
      status: response.status,
      detail: "The server sent a response the app could not read.",
      requestId: serverRequestId,
    });
  }

  return {
    data: payload as T,
    status: response.status,
    headers: response.headers,
    requestId: serverRequestId,
    elapsedMs,
  };
}

/** Returns undefined for an empty or non-JSON body (for example an nginx 502 HTML page). */
function parseJson(text: string): unknown {
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "http";
}

function fallbackDetail(status: number): string {
  if (status === 429) return "Too many requests. Please wait before trying again.";
  if (status === 502 || status === 503 || status === 504) {
    return `The CivicPulse API is unavailable right now (HTTP ${status}).`;
  }
  if (status >= 500) return `The server had a problem handling this request (HTTP ${status}).`;
  return `The request failed (HTTP ${status}).`;
}

export function toApiError(status: number, payload: unknown, headers: Headers, requestId: string): ApiError {
  const fieldErrors = extractFieldErrors(payload);
  return new ApiError({
    kind: kindForStatus(status),
    status,
    detail: extractDetail(payload) ?? fallbackDetail(status),
    requestId,
    fieldErrors,
    retryAfterSeconds: status === 429 || status === 503 ? parseRetryAfter(headers.get("Retry-After")) : null,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The server's human-readable message, exactly as sent. */
export function extractDetail(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const { detail, message } = payload;
  if (typeof detail === "string" && detail.trim() !== "") return detail;
  if (isRecord(detail) && typeof detail.message === "string") return detail.message;
  // FastAPI's default validation body: detail is a list of {loc, msg}.
  if (Array.isArray(detail)) return "Some fields are not valid.";
  if (typeof message === "string" && message.trim() !== "") return message;
  return null;
}

/**
 * Normalises every field-error shape we may meet into { field: message }:
 *   { errors: [{ field, message }] }            - the contract in openapi.json
 *   { errors: { field: message } }              - a common alternative
 *   { detail: [{ loc: ["body", field], msg }] } - FastAPI/Pydantic default
 */
export function extractFieldErrors(payload: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isRecord(payload)) return result;

  const add = (field: unknown, message: unknown) => {
    if (typeof field !== "string" || field === "" || typeof message !== "string") return;
    result[field] ??= message;
  };

  const { errors, detail } = payload;
  if (Array.isArray(errors)) {
    for (const item of errors) if (isRecord(item)) add(item.field, item.message ?? item.msg);
  } else if (isRecord(errors)) {
    for (const [field, message] of Object.entries(errors)) {
      add(field, Array.isArray(message) ? message[0] : message);
    }
  }

  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (!isRecord(item) || !Array.isArray(item.loc)) continue;
      const path = item.loc.filter((part): part is string => typeof part === "string");
      const field = path.filter((part) => !["body", "query", "path", "header"].includes(part)).at(-1);
      add(field, item.msg);
    }
  }
  return result;
}

/** Retry-After is either delta-seconds or an HTTP date (RFC 9110 section 10.2.3). */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
