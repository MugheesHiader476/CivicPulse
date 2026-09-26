import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { jsonResponse, mockFetch } from "./utils";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, sessionId: "citizen-session", getToken: async () => "test-session" }),
  UserButton: () => <span>Signed in</span>,
}));

describe("account routes", () => {
  it("shows only Report and My reports to a citizen", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    mockFetch(() => jsonResponse({ role: "citizen" }));
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /tell the city/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Report" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "My reports" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Stats" })).not.toBeInTheDocument();
  });

  it("does not render or request city statistics for a citizen, even at the direct URL", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    const { calls } = mockFetch((call) => {
      expect(call.url.pathname).toBe("/api/me");
      return jsonResponse({ role: "citizen" });
    });
    render(<MemoryRouter initialEntries={["/stats"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Admin access required" })).toBeInTheDocument();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.queryByRole("link", { name: "Stats" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "My reports" }).length).toBeGreaterThan(0);
  });

  it("lands an admin on the complaint board and shows only Admin and Stats", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    const { calls } = mockFetch((call) => {
      if (call.url.pathname === "/api/me") return jsonResponse({ role: "operator" });
      if (call.url.pathname === "/api/meta/providers") return jsonResponse({ active_provider: "rules", recent: [] });
      if (call.url.pathname === "/api/complaints") return jsonResponse({ items: [], total: 0, page: 1, page_size: 20 });
      throw new Error(`Unexpected request: ${call.url.pathname}`);
    });
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Complaint board" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Admin" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Stats" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Report" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My reports" })).not.toBeInTheDocument();
    expect(calls.some((call) => call.url.pathname === "/api/my/complaints")).toBe(false);
  });

  it("blocks an admin who opens a citizen report URL directly", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    const { calls } = mockFetch((call) => {
      if (call.url.pathname === "/api/me") return jsonResponse({ role: "operator" });
      if (call.url.pathname === "/api/meta/providers") return jsonResponse({ active_provider: "rules", recent: [] });
      throw new Error(`Unexpected request: ${call.url.pathname}`);
    });
    render(<MemoryRouter initialEntries={["/my-reports/example"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Citizen access required" })).toBeInTheDocument();
    expect(calls.some((call) => call.url.pathname.startsWith("/api/my/complaints"))).toBe(false);
  });
});
