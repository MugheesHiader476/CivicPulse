import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { Complaint } from "../src/api/client";
import { ToastProvider } from "../src/components/ToastProvider";

export function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

export interface FetchCall {
  url: URL;
  method: string;
  body: unknown;
  headers: Headers;
}

/**
 * Replaces global fetch with a handler and records every call.
 * The handler decides the response, so each test states exactly what the server says.
 */
export function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const call: FetchCall = {
      url: new URL(href, "http://civicpulse.test"),
      method: (init?.method ?? "GET").toUpperCase(),
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

export function renderPage(ui: ReactElement, { route = "/", path = "/" }: { route?: string; path?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<p>other route</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

export function makeComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: "3f2b8a4e-1c2d-4e5f-9a8b-7c6d5e4f3a2b",
    text: "Burst water main flooding Street 12 since fajr, water entering ground floors.",
    location: "Street 12, Samanabad",
    reporter_contact: null,
    category: "water",
    priority: "high",
    status: "open",
    ai_summary: "Burst water main flooding Street 12 since dawn.",
    triaged_by: "llm:groq",
    triage_latency_ms: 612,
    created_at: "2026-09-24T06:00:00Z",
    updated_at: "2026-09-24T06:00:00Z",
    ...overrides,
  };
}
