# Stop the demo safely

Press `Ctrl+C` in the terminal running `kubectl port-forward`, then run:

```powershell
docker compose down
docker stop civicpulse-control-plane
```

This stops CivicPulse without deleting Compose volumes, Docker images, Kubernetes resources, or the
saved kind cluster. Docker Desktop itself may remain open.
