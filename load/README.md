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

`kubectl port-forward service/backend` connects to a single pod, so every request lands on that
pod and replicas added by the HPA receive no traffic. To spread load across all replicas, send it
through the Ingress instead. The second measured run (after the VPA request update) used:

```bash
BASE_URL=http://127.0.0.1:8080 HOST_HEADER=civicpulse.local TARGET_PATH=/api/me   AUTH_TOKEN=demo-operator k6 run load/k6-script.js
```

`HOST_HEADER` lets k6 reach the host-routed Ingress without editing the hosts file; `demo-operator`
is the fixed demo identity accepted only in the dev overlay (`AUTH_MODE=demo`). In Git Bash on
Windows, prefix the command with `MSYS_NO_PATHCONV=1` so `/api/me` is not rewritten into a Windows
path. For any other authenticated route, set `BASE_URL`, `TARGET_PATH`, and `AUTH_TOKEN`. Never save
a real token in this repository. After the run, turn the timestamped HPA output into the required
replicas-vs-load chart and record the measured scale-up lag in `docs/ENGINEERING-NOTES.md`.
