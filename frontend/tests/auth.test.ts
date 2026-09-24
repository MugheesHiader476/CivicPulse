import { afterEach, expect, it } from "vitest";
import { getSessionToken, setSessionTokenGetter } from "../src/api/auth";
import { ApiError, apiRequest } from "../src/api/http";
import { jsonResponse, mockFetch } from "./utils";

afterEach(() => setSessionTokenGetter(null));

it("sends a fresh Clerk session token to every application endpoint", async () => {
  let next = 0;
  setSessionTokenGetter(async () => `session-${++next}`);
  const { calls } = mockFetch(() => jsonResponse({ ok: true }));
  await apiRequest("/api/complaints", { method: "POST", body: { text: "problem", location: "here" } });
  await apiRequest("/api/stats");
  await apiRequest("/api/complaints");
  await apiRequest("/api/complaints/id/status", { method: "PATCH", body: { status: "resolved" } });
  expect(calls.map((call) => call.headers.get("Authorization"))).toEqual([
    "Bearer session-1", "Bearer session-2", "Bearer session-3", "Bearer session-4",
  ]);
});

it("blocks API requests before fetch when no Clerk session is available", async () => {
  setSessionTokenGetter(null);
  const { calls } = mockFetch(() => jsonResponse({ ok: true }));
  await expect(apiRequest("/api/stats")).rejects.toMatchObject({
    kind: "unauthorized",
    status: 401,
  } satisfies Partial<ApiError>);
  expect(calls).toHaveLength(0);
  expect(await getSessionToken()).toBeNull();
});

it("treats a server-side 401 as an authorization error", async () => {
  mockFetch(() => jsonResponse({ detail: "Invalid or expired session" }, { status: 401 }));
  await expect(apiRequest("/api/stats")).rejects.toMatchObject({
    kind: "unauthorized",
    detail: "Invalid or expired session",
  } satisfies Partial<ApiError>);
});
