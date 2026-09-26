# CivicPulse API

FastAPI implementation of the SRS API table. PostgreSQL 16 stores complaints and outcomes;
Redis 7 provides a 30-second stats cache, 24-hour triage cache and per-IP rate limiter.
The application does not create tables at startup: run `alembic upgrade head` first.

## Run

From the repository root, configure Clerk keys in `frontend/.env.local`, then run
`bash scripts/dev-up.sh`. It creates a private, gitignored `.env` on first use, builds the
stack, applies migrations and seeds 30 complaints. Open `http://127.0.0.1:8080/sign-in`.
Set `CLERK_OPERATOR_USER_IDS` in `.env` to a comma-separated list of Clerk user IDs to
grant operator access. `docker compose down` stops the stack without deleting PostgreSQL
or Redis volumes.

For local Vite development alongside the container backend, run `npm run dev` in `frontend/`;
Vite proxies `/api` to `127.0.0.1:8000`. `npm run dev:mock` uses the browser-only fake API.

To run only API tests in the existing `.civic` environment:

```bash
cd backend
../.civic/bin/python -m pip install -r requirements-dev.txt
../.civic/bin/python -m pytest -q
```

## API and access

All `/api` routes require a verified Clerk session bearer token. Signed-in citizens can
`POST /api/complaints`, `GET /api/my/complaints`, `GET /api/my/complaints/{id}`, and `GET /api/me`. Every new report is tied to its submitting Clerk account. The personal endpoints return only that account's reports; a different account's report returns 404. The `/api/me` response reports
`citizen` or `operator`. Administrators, defined by `CLERK_OPERATOR_USER_IDS`, can use the city-wide complaint list/detail, statistics, status updates, and provider history. They cannot use the citizen submission or personal-report endpoints; those return 403. Citizen access to admin endpoints also returns 403.
`/health`, `/ready`, and `/metrics` remain public. The SRS does not define an identity
model; Clerk sessions and the explicit operator allowlist are this implementation's policy.

All application errors use a short `detail` string; validation errors also have
`errors: [{field, message}]`. Unexpected failures return a generic 503, and each response
includes an `X-Request-ID`. Complaint text, contact details and secrets are not logged.

`TRIAGE_PROVIDER=rules` works offline. `simulated` is deterministic for tests. `llm` uses Groq
and requires `GROQ_API_KEY`; `ollama` expects a running Ollama server at `OLLAMA_URL`.
External LLM requests send the complaint body only. See [PII ADR](../docs/adr/0004-pii-and-data-governance.md).

Operators can switch between Groq and local Ollama on the Stats page. The
operator-only `GET /api/meta/providers` reports the active choice, model, and
readiness; `PUT /api/meta/providers` with `{"provider":"groq"}` or
`{"provider":"ollama"}` changes the choice for all backend replicas. A provider
without a key or a pulled local model returns 409. Redis AOF persists the
operator choice; `TRIAGE_PROVIDER` remains the bootstrap default. New
complaints use the selected provider, while old outcomes stay unchanged.

The `(status, priority)` index serves filtered board queries. The `created_at` index supports
the newest-first paginated board. Redis AOF is persisted because the rate limiter and inference
cache benefit from surviving container restarts; the stats cache itself is disposable.

Uvicorn handles SIGTERM and drains in-flight requests for up to 30 seconds. `/health` checks
only the process; `/ready` checks PostgreSQL and Redis separately.
