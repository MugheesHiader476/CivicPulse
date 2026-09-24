import { describe, expect, it } from "vitest";
import { parseCacheHeader } from "../src/api/client";
import { ApiError, apiRequest, buildUrl, extractFieldErrors, parseRetryAfter } from "../src/api/http";
import { complaintRules } from "../src/api/rules";
import { readRuntimeConfig } from "../src/config";
import { pageWindow } from "../src/lib/pagination";
import { describeProvider } from "../src/lib/presentation";
import { newRequestId } from "../src/lib/requestId";
import { toPayload, validateDraft } from "../src/lib/validation";
import { jsonResponse, mockFetch } from "./utils";

describe("transport", () => {
  it("normalises every field-error shape the backend may send", () => {
    expect(extractFieldErrors({ errors: [{ field: "text", message: "too short" }] })).toEqual({ text: "too short" });
    expect(extractFieldErrors({ errors: { location: ["required"] } })).toEqual({ location: "required" });
    expect(
      extractFieldErrors({ detail: [{ loc: ["body", "reporter_contact"], msg: "too long", type: "string_too_long" }] }),
    ).toEqual({ reporter_contact: "too long" });
  });

  it("parses Retry-After as seconds or as an HTTP date", () => {
    const now = Date.parse("2026-09-24T10:00:00Z");
    expect(parseRetryAfter("30", now)).toBe(30);
    expect(parseRetryAfter("Thu, 24 Sep 2026 10:01:00 GMT", now)).toBe(60);
    expect(parseRetryAfter("soon", now)).toBeNull();
    expect(parseRetryAfter(null, now)).toBeNull();
  });

  it("turns a 409 into a conflict error that keeps the server's words", async () => {
    mockFetch(() => jsonResponse({ detail: "Invalid status transition: resolved -> open." }, { status: 409 }));
    const error = await apiRequest("/api/complaints/x/status", { method: "PATCH", body: { status: "open" } }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "conflict", status: 409, detail: "Invalid status transition: resolved -> open." });
  });

  it("reports a network failure without leaking a stack trace to the user", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const error = await apiRequest("/api/stats").catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "network", status: 0 });
    expect((error as ApiError).isTransient).toBe(true);
  });

  it("builds query strings without empty filters", () => {
    expect(buildUrl("/api/complaints", { category: "water", priority: null, status: undefined, page: 2 })).toBe(
      "/api/complaints?category=water&page=2",
    );
  });

  it("generates RFC 4122 v4 request ids", () => {
    expect(newRequestId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("reads X-Cache case-insensitively and never guesses", () => {
    expect(parseCacheHeader("hit")).toBe("HIT");
    expect(parseCacheHeader("MISS")).toBe("MISS");
    expect(parseCacheHeader(null)).toBe("unknown");
    expect(parseCacheHeader("STALE")).toBe("unknown");
  });
});

describe("validation mirrors the server schema", () => {
  it("reads the limits from openapi.json", () => {
    expect(complaintRules.text).toEqual({ min: 10, max: 2000, required: true });
    expect(complaintRules.location).toEqual({ min: 3, max: 200, required: true });
    expect(complaintRules.reporter_contact).toEqual({ max: 200, required: false });
  });

  it("validates trimmed values and sends null for an empty contact", () => {
    const draft = { text: "   short   ", location: "ab", reporter_contact: "  " };
    expect(Object.keys(validateDraft(draft))).toEqual(["text", "location"]);
    expect(toPayload({ text: " a real problem here ", location: " G-9 ", reporter_contact: " " })).toEqual({
      text: "a real problem here",
      location: "G-9",
      reporter_contact: null,
    });
  });
});

describe("runtime config and presentation", () => {
  it("falls back to safe defaults for missing or hostile values", () => {
    expect(readRuntimeConfig(undefined)).toEqual({ environment: "unknown", refreshSeconds: 15, clerkPublishableKey: "" });
    expect(readRuntimeConfig({ environment: "staging", refreshSeconds: "2" })).toEqual({
      environment: "staging",
      refreshSeconds: 5,
      clerkPublishableKey: "",
    });
    expect(readRuntimeConfig({ environment: "", refreshSeconds: "abc" })).toEqual({
      environment: "unknown",
      refreshSeconds: 15,
      clerkPublishableKey: "",
    });
  });

  it("describes each triage provider in plain language", () => {
    expect(describeProvider("llm:groq")).toMatchObject({ tone: "ai", label: "Groq LLM" });
    expect(describeProvider("llm:ollama").tone).toBe("local");
    expect(describeProvider("rules:fallback").tone).toBe("fallback");
    expect(describeProvider("rules").tone).toBe("rules");
    expect(describeProvider("something-new").label).toBe("something-new");
  });

  it("windows long page lists with gaps", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
  });
});
