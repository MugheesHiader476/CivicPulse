# Video command folder

Use these files in numeric order while recording `../DEMO-SCRIPT.md`. They are intentionally split
into short copy-and-paste blocks. Docker Compose and the kind Ingress both use host port `8080`, so
show them **sequentially**, not at the same time.

1. `01-docker-compose.md` - clean local startup and health proof.
2. `02-kubernetes.md` - switch from Compose to the saved kind cluster and show Kubernetes proof.
3. `03-rollback.md` - demonstrate both required rollback mechanisms.
4. `04-github.md` - open the real CI/CD evidence pages.
5. `05-stop-everything.md` - stop the demo without deleting data or the cluster.

Never show `.env`, credentials, tokens, private keys, or secret values in the recording.
