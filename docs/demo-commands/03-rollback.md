# Part 3 - Faseeh - Both rollback mechanisms

The first successful CD run must exist before recording this section. Set `PREVIOUS_SHA` to a real
previously published SHA tag in GHCR. Never use `latest` as a rollback target.

Fast imperative recovery:

```powershell
kubectl -n civicpulse rollout undo deployment/backend
kubectl -n civicpulse rollout status deployment/backend --timeout=180s
```

Say: "Rollout undo is the fast 3 a.m. recovery. After stability returns, we restore declarative
truth using the previous immutable SHA."

Auditable declarative recovery:

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

Say: "Reapplying the previous SHA records the intended state and is the auditable recovery after
the immediate incident is stable."
