# Engineering notes

These answers refer to this repository rather than generic definitions. Line numbers are for the
revision that introduced this document; use `rg -n` to refresh them after later edits.

## 1. Laptop versus CI runner

1. A laptop may have a different Python patch version or packages installed globally. Both
   backend stages freeze Python at `python:3.12.14-slim-bookworm`
   (`backend/Dockerfile:2` and `backend/Dockerfile:7`), so the runner and laptop build against the
   same OS/runtime base.
2. Local Node and web-server versions vary. The frontend build freezes Node at
   `node:22.20.0-alpine3.22` and the runtime at `nginx:1.30.5-alpine3.24`
   (`frontend/Dockerfile:6` and `frontend/Dockerfile:18`). `npm ci` then uses the committed lockfile.
3. A developer may already have PostgreSQL/Redis on host ports, while a fresh runner has neither.
   Compose pins `postgres:16.9-alpine3.22` and `redis:7.4.5-alpine3.21`
   (`compose.yaml:3` and `compose.yaml:24`), and the backend uses the service DNS names in
   `DATABASE_URL` and `REDIS_URL` (`compose.yaml:59-60`). There is no dependency on a runner's
   `localhost` services.

## 2. CI/CD maturity rung

The repository is at **continuous delivery with an automated ephemeral deployment**. Every PR is
linted, typed, tested, built, scanned, integration-tested, and manifest-validated. A merge to
protected `main` automatically publishes immutable images and deploys them to a disposable kind
cluster for rollout and Ingress smoke verification. It is not yet continuous deployment to a
persistent user-facing environment because the target is destroyed with the runner and no real
production approval/environment exists.

The next rung is continuous deployment to a persistent environment with GitHub Environment
protection, scoped cluster credentials or GitOps reconciliation, health-based promotion, and the
same SHA/digest reference. That buys a durable release history and eliminates a manual handoff,
but increases the blast radius, so rollback and observability evidence must be complete first.

## 3. Build once, deploy many

The publish boundary is the SHA tag at `.github/workflows/cd.yml:95` and `:106`. The deployment
job is gated by `needs: build-push` at `cd.yml:142`, pulls those same SHA references at
`cd.yml:171-174`, and inserts them into the rendered manifests at `cd.yml:194-197`. These lines,
together, are the guarantee: the deployment does not contain a `docker build`.

Without that boundary, a deploy-time rebuild could resolve a different base image or dependency
and run bytes that never passed tests, Trivy, or SBOM generation. The frontend also keeps runtime
configuration outside its bundle, so the one built image works behind different API upstreams.

## 4. Correctness for a probabilistic provider

For the live model, correctness is a set of invariants rather than one exact sentence: output must
parse as `TriageResult`, use an allowed enum, keep the summary within 140 characters, meet the
confidence range, return within the timeout, and never turn a provider outage into a failed citizen
submission. The provider validates JSON (`backend/app/providers/triage/llm.py:44` and `:77`), and
the service validates the typed result again (`backend/app/services/complaints.py:106`). Only the
documented transient class is retried once with jitter (`complaints.py:107-110`); every final
failure records `rules:fallback` (`complaints.py:84-89`).

CI never calls the live model. `TRIAGE_PROVIDER: simulated` is fixed in
`.github/workflows/ci.yml:55` and `.github/workflows/cd.yml:19`. `SimulatedTriage` reuses the
deterministic rules result and supports injected failures/malformed output, so success, fallback,
and schema rejection are repeatable.

## 5. Measured HPA lag

**Pending real cluster evidence - Mughees commit.** Run `load/k6-script.js` while capturing
`kubectl get hpa backend -w`, then record:

- offered load start time;
- first metrics change;
- first desired-replica change;
- first new backend pod Ready time;
- measured lag in seconds and the portions spent in metrics sampling, HPA reconciliation,
  scheduling, image/container start, and readiness.

Do not replace this section with an invented value. The current design has immediate scale-up
stabilization and a 300-second scale-down window (`k8s/base/hpa.yaml:24` and `:34`). Faster
metrics/reconciliation and pre-pulled smaller images can reduce scale-up lag; none removes the
need for baseline capacity.

## 6. Why VPA is Off

The VPA is recommender-only at `k8s/base/vpa.yaml:14`. HPA computes CPU utilization as usage
divided by the CPU request and targets 60% (`k8s/base/hpa.yaml:21`). If VPA Auto raises that same
request, reported utilization falls and HPA may remove pods; per-pod load then rises and VPA may
raise requests again. The two controllers would act on the same signal in opposing feedback loops.
Off mode preserves recommendations for a human-reviewed request change and repeat load test.

## 7. Hosted LLM with an internal network

PostgreSQL and Redis are attached only to the `internal: true` network (`compose.yaml:146`), and
the frontend is attached only to `edge`. The backend bridges `edge`, `internal`, and the isolated
AI network (`compose.yaml:74`). Because `edge` is not internal, the backend can make an outbound
TLS call to Groq while still reaching private data services; the frontend has no route to those
services. Ollama attaches to the isolated AI network and a separate `model-egress` network so it
can initially download weights (`compose.yaml:103` and `:147`) without exposing PostgreSQL or
Redis.

The trade-off is deliberate: `internal: true` is not a universal egress policy. The component that
owns the hosted provider call must also have a controlled non-internal route.

## 8. The failure that cost more than an hour

**Pending an honest team account - Mughees commit.** Write the actual incident using this shape:

- symptom and first timestamp;
- initial belief and why it seemed plausible;
- unsuccessful checks;
- exact command or log line that disproved the belief;
- root cause, fix, and a test/guard that now prevents recurrence.

Generic Kubernetes folklore or an invented failure scores zero. Use a real event from the cluster,
CI/CD, authentication, networking, or provider work and cite its evidence file.

## Data and cache choices

The `(status, priority)` index serves filtered operator-board queries and the `created_at` index
serves newest-first pagination (`backend/app/repositories/models.py:36-37`). The account-specific
index at `:38` serves a citizen's newest reports. Redis AOF is enabled and mounted at
`compose.yaml:25-27`: stats are rebuildable, but preserving provider selection, inference-cache
entries, and rate-window state avoids quota spikes and inconsistent behavior after a routine
restart.
