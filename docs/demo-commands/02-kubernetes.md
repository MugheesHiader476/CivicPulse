# Part 2 - Mughees - Kubernetes proof

Stop Compose without deleting its named volumes, then resume the saved kind cluster:

```powershell
docker compose down
docker start civicpulse-control-plane
kubectl config use-context kind-civicpulse
kubectl wait --for=condition=Ready node/civicpulse-control-plane --timeout=180s
kubectl wait --for=condition=Ready pods --all -n civicpulse --timeout=180s
```

Show the deployment, networking, persistence, and autoscaling objects:

```powershell
kubectl -n civicpulse get pods
kubectl -n civicpulse get services,ingress,pvc
kubectl -n civicpulse get hpa backend
kubectl -n civicpulse get vpa backend-vpa
kubectl top pods -n civicpulse
Get-Content docs/evidence/k6-summary.txt
Get-Content docs/evidence/hpa-watch.txt
```

If HPA briefly shows `<unknown>/60%`, wait about 20 seconds after Metrics Server becomes Ready and
run the HPA command again. Open `docs/evidence/scaling-chart.png` to show the measured scale-out.

To open the application through the Kubernetes frontend Service, keep this running in a separate
terminal:

```powershell
kubectl -n civicpulse port-forward service/frontend 8081:8080
```

Then open `http://127.0.0.1:8081/?demo_role=operator`.

Say: "The cluster has replicated frontend and backend workloads, persistent data, Ingress, HPA,
and VPA recommendations. Our recorded k6 run produced 150,559 requests with zero failures and the
HPA increased backend replicas under load."
