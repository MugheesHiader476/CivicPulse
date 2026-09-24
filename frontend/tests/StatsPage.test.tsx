import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StatsPage } from "../src/pages/StatsPage";
import { jsonResponse, mockFetch, renderPage } from "./utils";

const STATS = {
  total: 36,
  by_category: { water: 7, electricity: 6, sanitation: 7, roads: 6, streetlights: 5, other: 5 },
  by_priority: { high: 16, normal: 12, low: 8 },
  by_status: { open: 20, in_progress: 8, resolved: 5, rejected: 3 },
};
const PROVIDERS = {
  active_provider: "llm:groq",
  recent: [
    { complaint_id: null, provider: "rules:fallback", latency_ms: 10214, fallback: true, error_class: "TimeoutError", created_at: "2026-09-24T06:00:00Z" },
    { complaint_id: null, provider: "llm:groq", latency_ms: 600, fallback: false, error_class: null, created_at: "2026-09-24T05:00:00Z" },
  ],
};

describe("StatsPage", () => {
  it("renders aggregates and follows the X-Cache header from MISS to HIT", async () => {
    let statsCalls = 0;
    mockFetch((call) => {
      if (call.url.pathname === "/api/meta/providers") return jsonResponse(PROVIDERS);
      statsCalls += 1;
      return jsonResponse(STATS, { headers: { "X-Cache": statsCalls === 1 ? "MISS" : "HIT" } });
    });
    const user = userEvent.setup();
    renderPage(<StatsPage />, { route: "/stats", path: "/stats" });

    expect(await screen.findByTestId("cache-state")).toHaveTextContent("Cache MISS");
    expect(screen.getByText("Total complaints").parentElement).toHaveTextContent("36");
    const byCategory = screen.getByRole("region", { name: /by category/i });
    expect(within(byCategory).getByLabelText("Water: 7 (19%)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fetch again/i }));
    await waitFor(() => expect(screen.getByTestId("cache-state")).toHaveTextContent("Cache HIT"));
    expect(screen.getByText(/1 of 2 requests hit the cache/i)).toBeInTheDocument();
  });

  it("does not invent a cache state when the header is missing", async () => {
    mockFetch((call) =>
      call.url.pathname === "/api/meta/providers" ? jsonResponse(PROVIDERS) : jsonResponse(STATS),
    );
    renderPage(<StatsPage />, { route: "/stats", path: "/stats" });
    expect(await screen.findByTestId("cache-state")).toHaveTextContent("Cache state unknown");
  });

  it("surfaces the active provider and fallback count from /api/meta/providers", async () => {
    mockFetch((call) =>
      call.url.pathname === "/api/meta/providers" ? jsonResponse(PROVIDERS) : jsonResponse(STATS, { headers: { "X-Cache": "HIT" } }),
    );
    renderPage(<StatsPage />, { route: "/stats", path: "/stats" });

    const pipeline = await screen.findByRole("region", { name: /triage pipeline/i });
    expect(within(pipeline).getByText(/active:/i)).toHaveTextContent("Active: llm:groq");
    expect(within(pipeline).getByText("1 / 2")).toBeInTheDocument();
    expect(within(pipeline).getByLabelText("rules:fallback, 10 s, fell back to rules")).toBeInTheDocument();
  });
});
