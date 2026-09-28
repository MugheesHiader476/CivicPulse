# CivicPulse demo video - 4:40 maximum

The assignment requires an unlisted demo video of **five minutes or less** with **both partners
speaking**. This script covers every marked video item: clean clone to running system, AI triage,
fallback, failed frontend-to-database access, HPA scaling, and both rollback mechanisms.

Do not show `.env` files, API keys, passwords, tokens, or private browser tabs. Paste prepared
commands instead of typing slowly. Keep terminal and browser text readable at 1080p.

## Before recording - not part of the five minutes

Prepare a clean parent directory and keep the repository URL copied. Start Docker Desktop. Keep the
final green CI and CD pages open. If the Kubernetes cluster is not already running, deploy it using
`docs/RUNBOOK.md` before recording. Have `PREVIOUS_SHA` set to a real previously deployed image SHA
that is present in GHCR.

## 0:00-0:55 - Faseeh: clean clone and startup

Say: "CivicPulse accepts municipal complaints, triages them through a replaceable provider, and
keeps intake available through deterministic fallback. I will reproduce the stack from a clean
clone."

Run:

```powershell
git clone https://github.com/MugheesHiader476/CivicPulse.git
cd CivicPulse
./scripts/dev-up.ps1
docker compose ps
curl.exe -s http://127.0.0.1:8000/ready
```

Point out the healthy frontend, backend, PostgreSQL, and Redis services and the readiness response.
Open the citizen URL printed by the script.

## 0:55-1:55 - Faseeh: citizen and AI behavior

1. Enter short invalid values to show client validation.
2. Submit one realistic complaint and location.
3. Point out category, priority, summary, provider, latency, and reference ID.
4. Open **My reports** and show the submitted item.

Say: "The backend owns validation and triage. Provider output is schema-validated. A timeout is
retried once and then rules fallback still returns 201 instead of losing the complaint." Show the
recorded fallback outcome on the operator Stats page or `docs/evidence/triage-pipeline.png`.

## 1:55-2:45 - Mughees: operator, cache, and isolation

Open `http://127.0.0.1:8080/?demo_role=operator`. Find the new complaint, perform one valid status
change, and briefly show Stats/cache behavior.

Then demonstrate that the internet-facing frontend cannot reach PostgreSQL:

```powershell
docker compose exec frontend ping -c 1 postgres
```

The expected result is a failed lookup or unreachable host. Say: "This failure is intentional. The
frontend is attached only to the edge network; only the backend bridges edge and internal networks."

If `ping` is unavailable in the image, use this equivalent DNS check:

```powershell
docker compose exec frontend sh -c "getent hosts postgres || echo PASS: postgres is isolated"
```

## 2:45-3:35 - Mughees: Kubernetes and HPA

Run:

```powershell
kubectl config current-context
kubectl -n civicpulse get pods
kubectl -n civicpulse get services,ingress,pvc
kubectl -n civicpulse get hpa backend
Get-Content docs/evidence/k6-summary.txt
Get-Content docs/evidence/hpa-watch.txt
```

Open `docs/evidence/scaling-chart.png`. Say: "This real k6 run generated 150,559 requests with zero
failures. The HPA increased backend replicas under load, while VPA remained recommendation-only so
it would not fight the CPU-based HPA."

## 3:35-4:15 - Faseeh: both rollback mechanisms

First show the fast imperative rollback and wait for it:

```powershell
kubectl rollout undo deployment/backend -n civicpulse
kubectl rollout status deployment/backend -n civicpulse --timeout=180s
```

Explain: "This is the fast 3 a.m. recovery." Then demonstrate the auditable declarative method by
rendering the production overlay, replacing its placeholders with the previous immutable SHA, and
reapplying it:

```powershell
$owner = "mugheeshiader476"
$rollback = kubectl kustomize k8s/overlays/prod
$rollback = $rollback -replace 'ghcr.io/replace-me/civicpulse-backend:replace-with-git-sha', "ghcr.io/${owner}/civicpulse-backend:$env:PREVIOUS_SHA"
$rollback = $rollback -replace 'ghcr.io/replace-me/civicpulse-frontend:replace-with-git-sha', "ghcr.io/${owner}/civicpulse-frontend:$env:PREVIOUS_SHA"
$rollback | Set-Content "$env:TEMP\civicpulse-rollback.yaml"
kubectl apply -f "$env:TEMP\civicpulse-rollback.yaml"
kubectl -n civicpulse rollout status deployment/backend --timeout=180s
kubectl -n civicpulse rollout status deployment/frontend --timeout=180s
```

Explain: "Reapplying the previous SHA records the intended state and is the correct follow-up once
the incident is stable."

## 4:15-4:40 - Mughees: CI/CD and closing

Show the final green GitHub Actions pages. Point out CI tests, lint/type checks, integration,
manifests and image scans, followed by CD test, SHA-tagged image publication, SBOMs, ephemeral kind
deployment, and Ingress smoke test.

Say: "The repository uses `dev`, reviewed feature branches, protected `main`, and immutable SHA
deployments. A new evaluator can reproduce the local system using the commands shown at the start."

## Final recording checklist

- [ ] Total duration is at most 5:00; target 4:40.
- [ ] Faseeh and Mughees both speak.
- [ ] Clean clone and successful startup are visible.
- [ ] AI triage and a real fallback outcome are shown.
- [ ] Frontend-to-PostgreSQL access visibly fails.
- [ ] Real HPA output and scaling chart are shown.
- [ ] `kubectl rollout undo` and previous-SHA reapply are both demonstrated.
- [ ] Final CI and CD pages are green.
- [ ] No credential, token, private key, or `.env` content appears.
- [ ] The unlisted video URL is added to `docs/SUBMISSION-REPORT.md` before PDF export.
