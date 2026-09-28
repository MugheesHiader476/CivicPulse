# HPA load test

This k6 scenario raises traffic in three controlled stages so the backend HPA has enough time to
observe CPU and add replicas. It defaults to the backend's public, dependency-free `/health`
endpoint; port-forward the backend Service before running it:

```bash
kubectl -n civicpulse port-forward service/backend 8000:8000
```

In a second terminal, capture the HPA timeline and run the test:

```bash
kubectl -n civicpulse get hpa backend -w | tee docs/evidence/hpa-watch.txt
k6 run load/k6-script.js
```

In a third terminal, capture pod changes with timestamps:

```bash
kubectl -n civicpulse get pods -l app.kubernetes.io/name=backend -w
```

For an authenticated API route, set `BASE_URL`, `TARGET_PATH`, and `AUTH_TOKEN`. Never save a
token in this repository. After the run, turn the timestamped HPA output into the required
replicas-vs-load chart and record the measured scale-up lag in `docs/ENGINEERING-NOTES.md`.
