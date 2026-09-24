# CivicPulse - frontend

React 18 + Vite + TypeScript, served by nginx from a multi-stage image (assignment section 2.1).
Three views: **Report** (submit), **Dashboard** (paginated, filterable board with status changes) and
**Stats** (aggregates, X-Cache state and the triage pipeline), plus a complaint detail page.

## Run it

```bash
npm ci
npm run dev:mock      # full UI against an in-browser fake backend - no API needed
npm run dev           # against a real backend; /api is proxied to CIVICPULSE_API_TARGET (default http://127.0.0.1:8000)
```

Open http://localhost:5173. In mock mode the header shows a pink **MOCK-API** badge.

| Script | What it does |
|---|---|
| `npm run lint` | ESLint (typescript-eslint, react-hooks, react-refresh), zero warnings allowed |
| `npm run typecheck` | `tsc --noEmit` for the app, the tests and `vite.config.ts` |
| `npm test` / `npm run test:coverage` | Vitest + Testing Library component tests (jsdom) |
| `npm run build` | Type-check, then bundle to `dist/` |
| `npm run gen:api` | Regenerate `src/api/schema.gen.ts` from `openapi/openapi.json` |

## Container

```bash
docker build -t civicpulse-frontend .
docker run --rm -p 8080:8080 -e API_UPSTREAM=http://backend:8000 -e APP_ENV=staging civicpulse-frontend
```

- **Build stage:** `node:22.20.0-alpine3.22`, `npm ci` before `COPY . .` so the dependency layer is cached.
- **Runtime stage:** `nginx:1.27.5-alpine3.21`, runs as the unprivileged `nginx` user on port 8080, `HEALTHCHECK` on
  `/healthz`, exec-form `CMD`. The final image holds only nginx config and the static bundle: no Node, no
  `node_modules`, no source.
- **Build context:** 506 KB with `.dockerignore`. Without it, `node_modules` alone is well over 100 MB.

| Env var | Default | Purpose |
|---|---|---|
| `API_UPSTREAM` | `http://backend:8000` | Where nginx proxies `/api`. On Kubernetes use the FQDN `http://backend.civicpulse.svc.cluster.local:8000` |
| `APP_ENV` | `production` | Environment label shown in the header |
| `DASHBOARD_REFRESH_SECONDS` | `15` | Live dashboard polling interval (clamped 5-300) |

## Design decisions

**Runtime configuration** ([ADR 0002](../docs/adr/0002-frontend-runtime-config.md)). The bundle contains no backend
URL. The browser always calls the relative `/api/...`; nginx (Compose) or the Ingress (Kubernetes) routes it.
Non-URL settings come from `/config.js`, which nginx generates from environment variables when the container starts.
One image runs in every environment, and because requests are same-origin there is no CORS to configure.

**No business rules in the frontend.**
- Category, priority, summary and provider are rendered exactly as the server returns them.
- The status control offers every other status and lets the server decide. An invalid move comes back as **409**,
  and the server's `detail` is shown word for word (`src/components/StatusControl.tsx`). The only transition
  table is in the dev-only mock backend, and an ESLint rule stops app code from importing it.
- Enum values (for filters) are generated from the OpenAPI schema (`openapi-typescript --enum-values`), not hand-typed.

**Typed API client, checked against the OpenAPI schema.** `openapi/openapi.json` is the backend contract snapshot.
`npm run gen:api` turns it into `src/api/schema.gen.ts`. `src/api/client.ts` takes every request and response type
from it, and uses `satisfies Record<string, keyof paths>` so each URL is checked against the schema's paths.
When the backend changes, refresh the snapshot and `tsc` will show every place that no longer matches:

```bash
curl -s http://127.0.0.1:8000/openapi.json -o openapi/openapi.json
```

```bash
npm run gen:api
```

**Client-side validation mirrors the server rather than replacing it.** `src/api/rules.ts` reads the `minLength`
and `maxLength` limits straight from `openapi.json`, so the form and the API cannot drift apart. The server still
validates everything, and its field-level 400 errors are mapped back onto the matching inputs.

**Honest loading state.** While the server triages, the page shows a real elapsed timer and what the system is
documented to do at that point (10 s LLM timeout, one retry, rule-based fallback). There is no fake progress bar.

**Resilience.**
- Every request carries an `X-Request-ID`, which nginx forwards to the backend and error messages display.
- Requests have timeouts (45 s for submit, 15 s otherwise). Only transient failures are retried, never a 4xx.
- 429 locks the submit button with a live `Retry-After` countdown.
- Error boundaries wrap the whole app and each route, and reset on navigation.

**Security.**
- No secrets anywhere in the bundle.
- A strict CSP (`script-src 'self'`, `connect-src 'self'`, no inline scripts: the theme script is a file in `public/`).
- `nosniff`, `frame-ancestors 'none'`, and a non-root container.

**Accessibility & responsiveness.**
- Semantic landmarks, a skip link, labelled fields with `aria-describedby` errors, and keyboard-reachable chart
  marks with tooltips.
- A table view for every chart, and colour never carries meaning alone.
- The chart palette was checked for colour-vision deficiency.
- `prefers-reduced-motion` and forced-colours support.
- Light/dark/system themes.
- Layouts from 320 px phones (bottom tab bar) to wide desktops, with no horizontal page scroll.

## Tests (Vitest + Testing Library)

`tests/` holds 27 tests; component tests cover:

- Submit: client validation blocks the request; trimmed payload plus `X-Request-ID`; category, priority, AI summary
  and provider rendered; fallback explained; honest loading state; server 400 errors mapped to fields; 429
  Retry-After lock.
- Dashboard: filters and pagination sent to the API; **409 message shown verbatim**; status options come from the
  schema; 502 surfaced.
- Stats: aggregates, **X-Cache MISS → HIT**, a missing header stays "unknown", provider observability.
- ErrorBoundary: fallback and recovery.
- Transport, validation and config units.

## Notes for the backend

- `POST /api/complaints` returns 400 with `{ "detail": str, "errors": [{ "field", "message" }] }`. FastAPI's default
  `detail: [{loc, msg}]` shape is also understood.
- 409 and 404 use `{ "detail": str }`. That string is what operators read.
- `GET /api/stats` returns `{ total, by_category, by_priority, by_status }`, with an `X-Cache: HIT|MISS` header.
- `GET /api/meta/providers` returns `{ active_provider, recent: [{ complaint_id, provider, latency_ms, fallback, error_class, created_at }] }`.
- Behind nginx, the rate limiter must key on `X-Forwarded-For` / `X-Real-IP` (for example uvicorn `--proxy-headers`).
