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
A signed-in citizen sees only **Report** and **My reports**. Citizens submit complaints; administrators review them, change their status, and see city-wide numbers. An administrator sees only **Admin** (the complaint board) and **Stats** and lands on the board after sign-in. Admin accounts cannot submit complaints. To grant admin access, add the Clerk user ID of each administrator to `CLERK_OPERATOR_USER_IDS` in `.env` (comma separated), then rerun the script. The API enforces the same role split.

The placeholder is in `.env.example`: replace `user_replace_with_admin_clerk_id` with the administrator's user ID from the Clerk Dashboard. Sign in at `/sign-in` using that Clerk account to open Admin and Stats. Use a different, non-allowlisted Clerk account to submit and track reports. This setting takes user IDs, not an email address, password, Clerk secret, or publishable key. The script derives the exact Clerk frontend API origin from the publishable key for nginx's content security policy.

Reports created before the ownership migration (including seeded sample reports) have no linked account and appear only in Admin. New reports are linked to their submitting account. The normal startup script applies the migration; for an existing deployment run `alembic upgrade head` before accepting submissions.

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

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests targeting
`main`, pushes to `dev`, and manual dispatch. It checks Ruff, mypy, ESLint and TypeScript;
runs backend tests with a 65% coverage gate and frontend component tests; builds both
container images without pushing them; scans each image with pinned Trivy for fixable HIGH and
CRITICAL vulnerabilities; and runs an isolated Compose smoke test through nginx to the
API, PostgreSQL and Redis. The smoke test signs a session with a temporary CI-only key
and uses `TRIAGE_PROVIDER=simulated`, so CI needs no Clerk or Groq account secrets.

After pushing the workflow, enable a `main` branch ruleset in GitHub: require a pull
request, one approval, and the CI checks before merging. GitHub only lists check names
after the workflow has run once. This repository does not yet contain Kubernetes
overlays, so the PDF's kubeconform manifest job belongs with the Kubernetes work.
CI does not publish images or deploy; `cd.yml` and `release.yml` remain separate work.


## Scope of this implementation
The backend API, PostgreSQL migration, Redis cache and limiter, rules and simulated triage,
hosted Groq and local Ollama adapters, Docker development stack, and frontend API integration
and CI are implemented. The SRS also requests production Compose, Kubernetes, CD, review history,
load-test evidence and a demo video; those are separate deliverables and are not yet present.
