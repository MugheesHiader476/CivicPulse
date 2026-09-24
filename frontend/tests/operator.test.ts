import { afterEach, expect, it } from "vitest";
import { apiRequest } from "../src/api/http";
import { setOperatorToken } from "../src/api/operator";
import { jsonResponse, mockFetch } from "./utils";

afterEach(() => setOperatorToken(""));

it("sends the runtime operator token only to protected API routes", async () => {
  setOperatorToken("operator-secret");
  const { calls } = mockFetch(() => jsonResponse({ ok: true }));
  await apiRequest("/api/complaints", { method: "POST", body: { text: "problem", location: "here" } });
  await apiRequest("/api/stats");
  await apiRequest("/api/complaints");
  await apiRequest("/api/complaints/id/status", { method: "PATCH", body: { status: "resolved" } });
  expect(calls[0]?.headers.get("Authorization")).toBeNull();
  expect(calls[1]?.headers.get("Authorization")).toBeNull();
  expect(calls[2]?.headers.get("Authorization")).toBe("Bearer operator-secret");
  expect(calls[3]?.headers.get("Authorization")).toBe("Bearer operator-secret");
});
