# CivicPulse

Municipal complaint intake and operations dashboard built from the attached SRS. The web UI is
React 18, TypeScript and Vite; FastAPI supplies triage and the API; PostgreSQL stores complaints;
Redis handles caching and submission limits. Nginx serves the production frontend and proxies
same-origin `/api` requests to FastAPI.

## Quick start

Create a Clerk application, then run `clerk env pull` in `frontend/` to create
`frontend/.env.local`. With Docker running, from this directory:

```bash
bash scripts/dev-up.sh
```

The script creates a private `.env` with a random database password if one does not exist,
builds images, applies Alembic migrations, and seeds 30 complaints. If you already have a
`.env`, set a nonempty `POSTGRES_PASSWORD` there. Open <http://127.0.0.1:8080/sign-in>.
A signed-in citizen can report an issue and see aggregate stats. To enable the operations
dashboard, add the Clerk user ID of each operator to `CLERK_OPERATOR_USER_IDS` in `.env`
(comma separated), then rerun the script. Only allowlisted operators can read complaint
details or change status. The script derives the exact Clerk frontend API origin from the
publishable key for nginx's content security policy.

Run `docker compose down` to stop the stack without erasing data. Run
`docker compose exec backend python -m app.seed` to seed again; it adds zero duplicate rows.

See [backend README](backend/README.md) for access policy, API behavior and tests, and
[frontend README](frontend/README.md) for Vite development. The SRS is in `SRS/`.

## AI provider choice

Set `GROQ_API_KEY` in the private root `.env` for Groq. Run `bash scripts/dev-up.sh`
for the hosted option. To enable the local option, run:

```bash
bash scripts/dev-up.sh --local
```

The local command starts the optional Ollama service, downloads
`llama3.2:1b-instruct-q4_K_M` (about 808 MB), and warms it. The Ollama image needs
additional disk space and the local service is limited to 2 CPUs and 3 GB RAM.
Nothing is downloaded when you run without `--local`.

Sign in as an operator and open **Stats → Choose AI triage**. Select **Groq cloud**
or **Local Ollama**; unavailable choices are disabled. The choice applies to new
complaints across backend replicas and survives restarts in Redis. `TRIAGE_PROVIDER`
(`llm` for Groq, `ollama` for local, or `rules`) is only the initial default before
an operator selects a provider. Switching does not reclassify old complaints or
change the safety fallback: a failed AI call falls back to keyword rules. Groq
receives complaint text; the local option keeps it inside the Compose network.
The key never goes to the browser.

## Scope of this implementation

The backend API, PostgreSQL migration, Redis cache and limiter, rules and simulated triage,
hosted Groq and local Ollama adapters, Docker development stack, and frontend API integration
are implemented. The SRS also requests production Compose, Kubernetes, CI/CD, review history,
load-test evidence and a demo video; those are separate deliverables and are not yet present.
