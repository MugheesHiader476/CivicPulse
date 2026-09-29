# Engineering notes

These answers refer to this repository rather than generic definitions. Line numbers are for the
revision that introduced this document; use `rg -n` to refresh them after later edits.

## 1. Laptop versus CI runner

1. A laptop may have a different Python patch version or packages installed globally. Both
   backend stages freeze Python at `python:3.12.14-slim-bookworm`
   (`backend/Dockerfile:2` and `backend/Dockerfile:7`), so the runner and laptop build against the
   same OS/runtime base.
2. Local Node and web-server versions vary. The frontend build freezes Node at
   `node:22.22.2-alpine3.23` and the runtime at `nginx:1.30.5-alpine3.24`
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
`cd.yml:171-174`, and inserts them into the rendered manifests at `cd.yml:202-206`. These lines,
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

The real kind test used the committed `load/k6-script.js`: 150,559 requests completed with zero
failures and p95 latency of 252.38 ms. The timestamped capture in
`docs/evidence/hpa-timeline.csv` began with two replicas. CPU first appeared above the 60% target
at 19:46:01, and the first replica increase appeared at 19:46:22, an observed 21-second lag. The
deployment then grew 2 -> 3 -> 4 -> 5 -> 7 -> 9 while k6 increased toward 200 virtual users.

That lag includes the metrics-server sampling interval, HPA reconciliation, scheduling, container
start, and readiness; the five-second observation interval limits precision. The HPA has immediate
scale-up stabilization and a 300-second scale-down window (`k8s/base/hpa.yaml:24` and `:34`), so it
deliberately retained nine replicas after traffic stopped. Faster metrics/reconciliation and
pre-pulled smaller images can reduce scale-up lag; none removes the need for baseline capacity.
The raw timeline, k6 summary, VPA recommendation, and generated chart are committed under
`docs/evidence/`.

**Run 2, after the VPA request update.** Backend requests were raised from the guessed
`cpu: 200m / memory: 256Mi` to the VPA target `cpu: 977m / memory: 250Mi`
(`k8s/base/backend.yaml:105-110`) and the same k6 stages were re-run on 29 September. This time
the load went through the Ingress (`HOST_HEADER=civicpulse.local`, `TARGET_PATH=/api/me`) instead of
`kubectl port-forward`, because a port-forward pins every request to one pod and the new replicas in
run 1 received no traffic. Run 2 completed 248,691 requests at 829 requests/s with zero failures and
p95 40.78 ms (`docs/evidence/k6-summary-run2.txt`). CPU first exceeded 60% at 18:13:22 and the first
replica was added at 18:13:49, a 27-second lag; the deployment then grew 2 -> 3 -> 5 -> 7 -> 9 -> 10
as offered load rose from 83 to 189 virtual users (`docs/evidence/hpa-timeline-run2.csv`, unedited
watch output in `hpa-watch-run2-raw.txt`, chart in `scaling-chart.png`).

What changed about HPA behaviour: with a 977m request, the 60% target means about 586m of real CPU
per pod before the HPA reacts, against 120m before, so each replica now absorbs roughly five times
more work before scaling. Run 2 still reached `maxReplicas: 10` because the balanced Ingress path
did far more total work (about 6.6 cores at the peak against about 1.3 in run 1), and it stayed at
the ceiling with CPU near 70%. That is the capacity-planning point: at the maximum, the HPA can no
longer add capacity, so either `maxReplicas` or node capacity must be planned rather than left to
the autoscaler.

## 6. Why VPA is Off

The VPA is recommender-only at `k8s/base/vpa.yaml:14`. HPA computes CPU utilization as usage
divided by the CPU request and targets 60% (`k8s/base/hpa.yaml:21`). If VPA Auto raises that same
request, reported utilization falls and HPA may remove pods; per-pod load then rises and VPA may
raise requests again. The two controllers would act on the same signal in opposing feedback loops.
Off mode preserves recommendations for a human-reviewed request change and repeat load test.

The loop was followed with Off mode: (1) the guessed requests were `cpu: 200m / memory: 256Mi`;
(2) load was applied; (3) VPA recommended target `977m / 250Mi`, lower bound `50m / 250Mi`, upper
bound `2 / 2Gi` (`docs/evidence/vpa-recommendations.txt`); (4) requests were changed to that target
(`k8s/base/backend.yaml:105-110`); (5) the load test was re-run and the change is reported in
question 5. After run 2 the recommendation moved to a `763m / 250Mi` target
(`docs/evidence/vpa-recommendations-run2.txt`). The first target was inflated because run 1
concentrated all traffic on one pod; balanced load gave a lower, more trustworthy figure. A human
applies the next change only after reviewing it, which is exactly why Off mode is used.

## 7. Hosted LLM with an internal network

PostgreSQL and Redis are attached only to the `internal` network (`compose.yaml:10` and `:28`),
which is declared `internal: true` at `compose.yaml:151`, and the frontend is attached only to
`edge` (`compose.yaml:126`). The backend bridges `edge`, `internal`, and the isolated AI network
(`compose.yaml:75`). Because `edge` is not internal, the backend can make an outbound
TLS call to Groq while still reaching private data services; the frontend has no route to those
services. Ollama attaches to the isolated AI network and a separate `model-egress` network so it
can initially download weights (`compose.yaml:102-105` and `:149`) without exposing PostgreSQL or
Redis.

The trade-off is deliberate: `internal: true` is not a universal egress policy. The component that
owns the hosted provider call must also have a controlled non-internal route.

## 8. The failure that cost more than an hour

During the first real kind deployment on 28 September, PostgreSQL stayed in `CrashLoopBackOff`,
which left the migration job at `Init:0/1` and both backend replicas failing readiness. The first
working theory was that the dynamically provisioned volume had not been assigned `fsGroup: 70`,
because the StatefulSet already ran the Alpine image as UID/GID 70. Reapplying the StatefulSet and
waiting for its rollout did not change the existing failing pod.

`kubectl -n civicpulse logs postgres-0 --previous` supplied the decisive evidence:

```text
chmod: /var/lib/postgresql/data: Operation not permitted
initdb: error: could not change permissions of directory "/var/lib/postgresql/data"
```

The volume provider exposed a mount root that the non-root PostgreSQL process could write through
the assigned group but could not itself `chmod`. The fix sets
`PGDATA=/var/lib/postgresql/data/pgdata`, allowing PostgreSQL to create and own a child directory
while preserving the non-root container policy. Because StatefulSet rolling replacement was
waiting on the unhealthy old revision, the already-empty failed pod was deleted once; its
controller recreated it from the new template. PostgreSQL became Ready, migration completed, and
both backend replicas passed readiness.

The guard is operational and repeatable: the local/CD deployment waits for the PostgreSQL
StatefulSet, migration Job, and backend rollout. The verified persistence test then deleted
`postgres-0` after creating a complaint. The recreated pod returned that same complaint through
Ingress, proving that the child `PGDATA` directory remained on the bound PVC.

## Volumes and the development bind mount

Compose declares three named volumes (`compose.yaml:153-156`):

- `pgdata` (`compose.yaml:8-9`) holds the PostgreSQL data directory. It is the durable one: complaints
  survive `docker compose down` and `up` because the container is disposable and the volume is not.
- `redisdata` (`compose.yaml:26-27`) holds Redis's append-only file. The justification is below.
- `ollama_models` (`compose.yaml:100-101`) stores the downloaded model weights (about 808 MB), so the
  optional local-AI path does not re-pull them on every `up`.

The development file also bind-mounts `./backend/app` read-only into the backend and runs uvicorn
with `--reload` (`compose.yaml:72-74`), so a saved source change is live in seconds. That is right in
`compose.yaml` because it is a developer loop on one laptop. It is wrong in `compose.prod.yaml`,
which has no bind mount: production must run exactly the bytes inside the tested, SHA-tagged image,
not whatever source happens to be on the host.

## Data and cache choices

The `(status, priority)` index serves filtered operator-board queries and the `created_at` index
serves newest-first pagination (`backend/app/repositories/models.py:36-37`). The account-specific
index at `:38` serves a citizen's newest reports. Redis AOF is enabled and mounted at
`compose.yaml:25-27`: stats are rebuildable, but preserving provider selection, inference-cache
entries, and rate-window state avoids quota spikes and inconsistent behavior after a routine
restart.
