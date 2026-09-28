# Part 1 - Faseeh - Docker clean start

Say: "CivicPulse accepts municipal complaints, uses replaceable AI triage, and remains available
through deterministic fallback. I will start the complete stack from a clean checkout."

From the repository root, paste:

```powershell
docker stop civicpulse-control-plane 2>$null
./scripts/dev-up.ps1
docker compose ps
curl.exe -s http://127.0.0.1:8000/ready
```

Show that frontend, backend, PostgreSQL, and Redis are healthy and readiness reports PostgreSQL and
Redis as `ok`. Use the citizen and operator URLs printed by the startup script.
