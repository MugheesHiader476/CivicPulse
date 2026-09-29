# CivicPulse video cue sheet - target 4:20

The rubric requires an unlisted video of **5:00 or less** with **both partners speaking**. Keep this
file open beside the terminal and paste the commands. Do not show `.env`, keys, passwords, or tokens.

## Open before recording

- Citizen: `http://127.0.0.1:8080/?demo_role=citizen`
- Operator: `http://127.0.0.1:8080/?demo_role=operator`
- Green CI: `https://github.com/MugheesHiader476/CivicPulse/actions/runs/36477603582`
- CD workflow: `https://github.com/MugheesHiader476/CivicPulse/actions/workflows/cd.yml`
- Scaling chart: `docs/evidence/scaling-chart.png`

Replace the CD workflow link with the final successful run link after `main` is merged. Set
`PREVIOUS_SHA` to a real previous image SHA before recording the rollback.

## 0:00-0:50 - Faseeh: clean start

**Say:** "CivicPulse accepts municipal complaints, uses replaceable AI triage, and remains available
through a deterministic fallback. I will start the complete system from a clean clone."

**Run:**

```powershell
git clone https://github.com/MugheesHiader476/CivicPulse.git
cd CivicPulse
./scripts/dev-up.ps1
docker compose ps
curl.exe -s http://127.0.0.1:8000/ready
```

**Show:** four healthy services and readiness reporting PostgreSQL and Redis as `ok`.

## 0:50-1:40 - Faseeh: citizen and triage

**Do:** open the citizen tab, briefly trigger validation with short text, then submit one realistic
complaint and open **My reports**.

**Say:** "The backend validates and stores the report, then returns category, priority, summary,
provider, and latency. Provider output is schema-validated. If AI times out, it is retried once and
rules fallback still returns a successful complaint instead of losing it."

**Show:** the result and one real fallback entry on Stats. Do not spend time reading every field.

## 1:40-2:25 - Mughees: operator, cache, and isolation

**Do:** open the operator tab, find the complaint, change its status, then open Stats and show cache
MISS/HIT.

**Run:**

```powershell
docker compose exec frontend ping -c 1 postgres
```

Expected: `ping: bad address 'postgres'`. If `ping` is unavailable, run:

```powershell
docker compose exec frontend sh -c "getent hosts postgres || echo PASS: postgres is isolated"
```

**Say:** "This failure is intentional. The frontend is only on the edge network. Only the backend
bridges the edge and internal networks, so a compromised frontend cannot reach PostgreSQL."

## 2:25-3:05 - Mughees: Kubernetes autoscaling

**Run:**

```powershell
kubectl -n civicpulse get pods
kubectl -n civicpulse get hpa backend
Get-Content docs/evidence/k6-summary.txt
Get-Content docs/evidence/hpa-watch.txt
```

**Show:** `docs/evidence/scaling-chart.png`.

**Say:** "Our real k6 run sent 150,559 requests with zero failures. The HPA increased backend
replicas under load. VPA is recommendation-only so it does not fight the CPU-based HPA."

## 3:05-3:55 - Faseeh: both rollbacks

**Run the fast rollback:**

```powershell
kubectl -n civicpulse rollout undo deployment/backend
kubectl -n civicpulse rollout status deployment/backend --timeout=180s
```

**Say:** "Rollout undo is the fast 3 a.m. recovery. After stability returns, we restore declarative
truth using the previous immutable SHA."

**Run the auditable rollback:**

```powershell
$owner = "mugheeshiader476"
$rollback = kubectl kustomize k8s/overlays/prod
$rollback = $rollback -replace 'ghcr.io/replace-me/civicpulse-backend:replace-with-git-sha', "ghcr.io/${owner}/civicpulse-backend:$env:PREVIOUS_SHA"
$rollback = $rollback -replace 'ghcr.io/replace-me/civicpulse-frontend:replace-with-git-sha', "ghcr.io/${owner}/civicpulse-frontend:$env:PREVIOUS_SHA"
$rollback | Set-Content "$env:TEMP\civicpulse-rollback.yaml"
kubectl apply -f "$env:TEMP\civicpulse-rollback.yaml"
kubectl -n civicpulse rollout status deployment/backend --timeout=180s
```

## 3:55-4:20 - Mughees: delivery and close

**Show:** the final green CI run, then the final green CD run.

**Say:** "CI tests, lints, builds, scans, validates manifests, and smoke-tests the stack. CD retests
the merged result, publishes SHA-tagged images and SBOMs, deploys to a temporary Kubernetes cluster,
and smoke-tests through Ingress. Protected main requires review and all checks. A new evaluator can
reproduce CivicPulse with the commands shown at the start."

## Final check

- Both partners spoke.
- Clean clone, triage, real fallback, network failure, HPA scaling, and both rollbacks were shown.
- Final CI and CD were green.
- Total duration was below 5:00.
- No secret or `.env` content appeared.
- The unlisted video URL was added to `docs/SUBMISSION-REPORT.md` and the submitted PDF.
