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
| `scaling-chart.png` | Run 2 (after the VPA request update): backend replicas plotted against offered load (k6 virtual users and throughput) and CPU, from `hpa-timeline-run2.csv`. |
| `scaling-chart-run1.png` | Run 1 (original 200m request): replicas plotted against CPU from `hpa-timeline.csv`. |
| `ci-green.png` | GitHub Actions CI succeeds for commit `471f524` on `dev`, including tests, lint/type checks, manifests, builds, integration, and image scans. |
| `blocked-merge.png` | A deliberately failing backend check and missing approval prevent PR #19 from merging. |
| `green-pipeline.png` | The same release PR passes all nine required pull-request jobs after the repair. |
| `branch-protection.png` | The active ruleset targets `main`, requires PR/check gates, and blocks deletion/force-push. |
| `hpa-watch.txt` | Run 1 timestamped HPA observations used for autoscaling analysis. |
| `hpa-watch-run2-raw.txt` | Run 2 unedited `kubectl get hpa backend -w` output. |
| `hpa-samples-run2.txt` | Run 2 `kubectl get hpa` sampled every 5 seconds with timestamps, used for lag analysis. |
| `hpa-timeline-run2.csv` | Run 2 k6 offered load (virtual users, requests/s) joined with HPA CPU and replicas, per 5 seconds. |
| `k6-summary-run2.txt` | Run 2 k6 end-of-test summary. |
| `vpa-recommendations-run2.txt` | `kubectl describe vpa backend-vpa` after run 2. |
| `triage-cache-hit-rate.txt` | Measured content-hash triage cache hit rate: workload, per-request results, and raw counters. |
| `image-and-context-sizes.txt` | Build-context sizes with and without `.dockerignore`, build-stage and final image sizes. |
| `cd-green.png` | The final `main` CD run completes test, build-push, and deploy-k8s. |
| `ghcr-images.png` | Backend and frontend images published to GHCR. |
| `release-overview.png` | GitHub release `v1.0.0` with generated notes. |
| `release-assets.png` | Release assets including both SPDX SBOMs. |
| `hpa-timeline.csv` | Normalized autoscaling observations used to generate the scaling chart. |
| `k6-summary.txt` | Load-test totals, failure rate, and response-time measurements. |
| `vpa-recommendations.txt` | A real Vertical Pod Autoscaler recommendation for the backend workload. |

## Still required before submission

The following evidence must come from later real actions and must not be fabricated:

- final PDF report and unlisted demonstration-video URL.

See `../EVIDENCE-GUIDE.md` for the capture procedure and expected filenames.
