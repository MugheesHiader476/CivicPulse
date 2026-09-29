# CivicPulse operations runbook

## Before a deployment

Required tools are Docker, `kubectl`, kind, k6, and a shell with `sed`. Confirm the source and
immutable image reference before touching a cluster:

```bash
git status --short
git rev-parse HEAD
```

The automated path is `.github/workflows/cd.yml`: a push to protected `main` tests the merged
revision, publishes SHA-tagged images, creates an ephemeral kind cluster, waits for every rollout,
and smoke-tests the Ingress. Do not deploy `latest`.

## Create the local cluster

This project uses **kind** (Kubernetes in Docker), matching the disposable cluster used by GitHub
Actions. Docker Desktop supplies the Docker engine, but its separate built-in Kubernetes cluster
does not need to be enabled. After creation, `kubectl config current-context` must print
`kind-civicpulse`; enabling another local cluster can silently switch the active context.

```bash
kind create cluster --name civicpulse --config .github/kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/kind/deploy.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.9.0/components.yaml
kubectl patch deployment metrics-server -n kube-system --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

Install VPA 1.7.1 from the official release so the committed `VerticalPodAutoscaler` resource has
a CRD and a recommender:

```bash
mkdir -p /tmp/autoscaler
git -C /tmp/autoscaler init
git -C /tmp/autoscaler remote add origin https://github.com/kubernetes/autoscaler.git
git -C /tmp/autoscaler fetch --depth 1 origin \
  refs/tags/vertical-pod-autoscaler-1.7.1:refs/tags/vertical-pod-autoscaler-1.7.1
git -C /tmp/autoscaler checkout --detach refs/tags/vertical-pod-autoscaler-1.7.1
/tmp/autoscaler/vertical-pod-autoscaler/hack/vpa-up.sh
```

For local images, build and load the tags referenced by the dev overlay:

```bash
docker build -t civicpulse-backend:local backend
docker build -t civicpulse-frontend:local frontend
kind load docker-image --name civicpulse civicpulse-backend:local civicpulse-frontend:local
```

## Create secrets before workloads

`k8s/base/secret.yaml` is a placeholder contract and is deliberately excluded from the
Kustomization. Create the real Secret first so PostgreSQL and the backend start with the same
password. Keep values in the shell or in a file outside this repository.

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl -n civicpulse create secret generic civicpulse-secrets \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  --from-file=CLERK_JWT_KEY="$CLERK_JWT_KEY_FILE" \
  --from-literal=CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY" \
  --from-literal=GROQ_API_KEY="$GROQ_API_KEY"
```

Never paste the resulting Secret YAML into Git. Base64 is encoding, not encryption.

## Deploy and verify

```bash
kubectl apply -k k8s/overlays/dev
kubectl -n civicpulse wait --for=condition=complete job/civicpulse-migrate --timeout=180s
kubectl -n civicpulse rollout status statefulset/postgres --timeout=180s
kubectl -n civicpulse rollout status deployment/redis --timeout=180s
kubectl -n civicpulse rollout status deployment/backend --timeout=240s
kubectl -n civicpulse rollout status deployment/frontend --timeout=180s
kubectl -n civicpulse get pods,services,ingress,hpa
```

Map `civicpulse.local` to `127.0.0.1`, then open `http://civicpulse.local:8080`. Verify a citizen
submission, an operator status update, and `MISS` then `HIT` on Stats. The CD workflow performs
the same authenticated API path with an ephemeral signing key.

## Logs and health

```bash
kubectl -n civicpulse logs deployment/backend --all-containers --since=10m
kubectl -n civicpulse logs deployment/frontend --all-containers --since=10m
kubectl -n civicpulse get events --sort-by=.lastTimestamp
kubectl -n civicpulse describe pod -l app.kubernetes.io/name=backend
kubectl -n civicpulse port-forward service/backend 8000:8000
curl -i http://127.0.0.1:8000/health
curl -i http://127.0.0.1:8000/ready
curl -s http://127.0.0.1:8000/metrics
```

`/health` proves the process is alive and never checks the database. `/ready` names unavailable
PostgreSQL or Redis dependencies and controls whether a pod receives traffic.

## When triage starts failing

1. Search backend logs for `"message":"triage_fallback"`; correlate with `request_id`.
2. Inspect `civicpulse_triage_fallback_total` and `civicpulse_triage_latency_seconds` in `/metrics`.
3. Check the operator provider view for error class, latency, and the active provider.
4. Confirm Groq key/quota or Ollama model availability without printing a key.
5. Keep the service available on `rules:fallback`; do not disable complaint intake merely because
   the optional provider is unhealthy.
6. Switch to the known-good provider in the operator UI. If the deployment itself introduced the
   failure, roll it back.

## Rollback

For immediate incident recovery, use the previous ReplicaSet and watch it complete:

```bash
kubectl -n civicpulse rollout undo deployment/backend
kubectl -n civicpulse rollout status deployment/backend --timeout=240s
```

This is fast but imperative. After the service is stable, restore declarative truth by rendering
the previous known-good SHA and applying the saved manifest:

```bash
PREVIOUS_SHA=<known-good-commit-sha>
OWNER=<lowercase-github-owner>
kubectl kustomize k8s/overlays/prod > /tmp/civicpulse-rollback.yaml
sed -i "s|ghcr.io/replace-me/civicpulse-backend:replace-with-git-sha|ghcr.io/$OWNER/civicpulse-backend:$PREVIOUS_SHA|g" /tmp/civicpulse-rollback.yaml
sed -i "s|ghcr.io/replace-me/civicpulse-frontend:replace-with-git-sha|ghcr.io/$OWNER/civicpulse-frontend:$PREVIOUS_SHA|g" /tmp/civicpulse-rollback.yaml
kubectl apply -f /tmp/civicpulse-rollback.yaml
kubectl -n civicpulse rollout status deployment/backend --timeout=240s
kubectl -n civicpulse rollout status deployment/frontend --timeout=180s
```

Save the SHA, commands, rollout output, and incident reason. Do not use `latest` as a rollback
target.

## Autoscaling evidence

Follow `load/README.md` for the k6/HPA capture. After the run:

```bash
kubectl -n civicpulse describe vpa backend-vpa
kubectl -n civicpulse get hpa backend
```

Commit only measured HPA output, the replicas-vs-load chart, and the VPA Target/Lower/Upper
recommendations. Update requests from that evidence, rerun the load test, and report the observed
change; never invent recommendations on a machine where the test was not run.
