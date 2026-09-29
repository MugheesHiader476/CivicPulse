# CivicPulse evidence catalogue

This directory contains evidence captured from real CivicPulse executions on the partners' shared
development laptop. The catalogue records exactly what each artifact proves so the submission
report does not make claims beyond the available evidence. No passwords, API keys, access tokens,
database credentials, or private signing keys may be included.

## Verified captures

| Artifact | What the real run demonstrates |
| --- | --- |
| `citizen-submit.png` | A citizen enters a natural-language complaint, location, and optional contact details. |
| `operator-dashboard.png` | The submitted complaint reaches the operator view with its category, priority, status, summary, location, reference, and triage timing. |
| `operator-stats-charts.png` | Live category, priority, and workflow-status aggregates are rendered from the statistics endpoint. |
| `triage-pipeline.png` | Measured triage latency and fallback totals are exposed to operators. |
| `provider-selector.png` | Operators can inspect the Groq, local Ollama, and deterministic-rules provider choices and availability. |
| `status-transition.png` | A permitted complaint workflow transition succeeds and produces user feedback. |
| `invalid-status-transition.png` | The server rejects an illegal resolved-to-open transition with HTTP 409. |
| `validation-error.png` | Client-side validation prevents undersized complaint and location values. |
| `rate-limit.png` | Six complaint submissions succeed with HTTP 201 and the seventh is rate-limited with HTTP 429. |
| `redis-cache-miss.png` | The first aggregate request is computed from PostgreSQL and stored in Redis. |
| `redis-cache-hit.png` | A repeated aggregate request is served from Redis with a visible cache hit and lower round-trip time. |
| `docker-compose-healthy.png` | A clean clone starts backend, frontend, PostgreSQL, and Redis; all services are healthy and backend readiness confirms both dependencies. |
| `docker-images.png` | Backend and frontend images use non-root users, include health checks, and have measured sizes of approximately 322 MB and 94.2 MB. |
| `k8s-resources.png` | The kind cluster runs replicated backend/frontend workloads, PostgreSQL, Redis, services, Ingress, bound PVCs, and an HPA. |
| `hpa-load.png` | The backend HPA scales under a real k6 load test. |
| `scaling-chart.png` | Replica changes are plotted from the captured HPA watch timestamps rather than invented data. |
| `ci-green.png` | GitHub Actions CI succeeds for commit `471f524` on `dev`, including tests, lint/type checks, manifests, builds, integration, and image scans. |
| `blocked-merge.png` | A deliberately failing backend check and missing approval prevent PR #19 from merging. |
| `green-pipeline.png` | The same release PR passes all nine required pull-request jobs after the repair. |
| `branch-protection.png` | The active ruleset targets `main`, requires PR/check gates, and blocks deletion/force-push. |
| `hpa-watch.txt` | Raw timestamped HPA observations used for autoscaling analysis. |
| `hpa-timeline.csv` | Normalized autoscaling observations used to generate the scaling chart. |
| `k6-summary.txt` | Load-test totals, failure rate, and response-time measurements. |
| `vpa-recommendations.txt` | A real Vertical Pod Autoscaler recommendation for the backend workload. |

## Still required before submission

The following evidence must come from later real actions and must not be fabricated:

- successful CD deployment for the final `main` SHA;
- published backend/frontend GHCR packages;
- generated GitHub Release with release notes and attached SBOMs;
- final PDF report and unlisted demonstration-video URL.

See `../EVIDENCE-GUIDE.md` for the capture procedure and expected filenames.
