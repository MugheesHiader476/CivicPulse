# ADR 0002 - Frontend runtime configuration

**Status:** Accepted
**Context:** Assignment 01, section 2.1 - "Runtime configuration, the part most students get wrong".

## Problem

Vite replaces `import.meta.env.*` with literal values at build time. If the backend URL were read that way,
the frontend image would only work in the environment it was built for, and we would have to rebuild it for
laptop, CI and cluster. That breaks build-once-deploy-many.

## Decision

1. **The browser never knows a backend URL.** Every API call uses the relative path `/api/...`
   (`frontend/src/api/http.ts`, `frontend/src/api/client.ts`). The request goes to whatever origin served the page.
   - **Docker Compose:** the frontend's nginx proxies `/api/` to `${API_UPSTREAM}` (default `http://backend:8000`)
     - see `frontend/nginx/default.conf.template`.
   - **Kubernetes:** the Ingress routes `/api` to the backend Service and `/` to the frontend Service on one host,
     so `/api` never reaches the frontend pods. The nginx proxy stays as a fallback (set
     `API_UPSTREAM=http://backend.civicpulse.svc.cluster.local:8000`, because nginx's resolver ignores DNS search domains).
   - **Laptop:** the Vite dev server proxies `/api` to `CIVICPULSE_API_TARGET` (default `http://127.0.0.1:8000`).
2. **Non-URL settings come from `/config.js`, generated when the container starts.** nginx renders it from
   environment variables (`APP_ENV`, `DASHBOARD_REFRESH_SECONDS`) through the official image's template step.
   `src/config.ts` reads `window.__CIVICPULSE_CONFIG__`, checks every value, and falls back to safe defaults.

## Consequences

- One image, many environments: `docker run -e APP_ENV=staging -e API_UPSTREAM=http://api:8000 civicpulse-frontend`.
- Same-origin requests, so there is **no CORS** to configure and no preflight on POST/PATCH. The `X-Cache` and
  `Retry-After` headers are readable without `Access-Control-Expose-Headers`.
- The CSP can say `connect-src 'self'`.
- nginx re-resolves the upstream name every 10 s (`resolver` + variable `proxy_pass`), so a restarted backend
  container with a new IP does not cause 502s, and nginx starts even if the backend is not up yet.
- The backend sees nginx as the TCP peer. Its per-IP rate limiter **must** use `X-Forwarded-For` / `X-Real-IP`
  from a trusted proxy (for example uvicorn `--proxy-headers --forwarded-allow-ips`), or every citizen shares one bucket.
- `/config.js` is public. It must never contain a secret, and nothing in the frontend does.

## Alternatives considered

- **Bake `VITE_API_URL` at build time** - rejected: one image per environment.
- **Only `/config.js` with an absolute `API_BASE_URL`** - works, but needs CORS on the backend, exposed headers
  for `X-Cache`/`Retry-After`, and a wider CSP. The proxy makes all three unnecessary.
