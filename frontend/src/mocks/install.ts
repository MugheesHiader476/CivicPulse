import { FakeBackend } from "./fakeBackend";

/** Routes /api/* fetches to the in-browser fake backend. Dev-only; see main.tsx. */
export function installMockApi(): void {
  const backend = new FakeBackend();
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      return realFetch(input, init);
    }
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(init?.headers);
    return backend.handle({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
      signal: init?.signal ?? null,
      requestId: headers.get("X-Request-ID") ?? "mock-request",
    });
  };

  console.info("%c[CivicPulse] Mock API active - no real backend is being called.", "color:#ff3d7f;font-weight:bold");
}
