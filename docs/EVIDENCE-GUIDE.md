# CivicPulse evidence and screenshot guide

Every image must show a real run. Keep the browser address bar, repository name, command, relevant
output, and date visible where practical. Do not crop away failed checks or replace measured values
with invented ones. Save images under `docs/evidence/` with the filenames below, then link them in
`SUBMISSION-REPORT.md` before exporting the final PDF.

## 1. Git and collaboration

1. In GitHub, open **Settings → Rules → Rulesets → main protection**. Capture the target branch,
   required pull request, one approval, required status checks, and blocked force-push/deletion as
   `branch-protection.png`.
2. Open a pull request with a deliberately failing required check and show that Merge is blocked.
   Save `blocked-merge.png`. After fixing the fault, capture the same PR with all checks green as
   `green-pipeline.png`.
3. Capture the **Issues** list and **Pull requests** list showing at least five merged PRs. Each PR
   must contain `Closes #<issue>` and a substantive review from the other partner. Add the URLs to
   the report table.
4. Capture `git log --graph --decorate --oneline --all` in a wide terminal as `git-graph.png`.
5. Create a real, harmless conflict on two feature branches by editing the same documentation line.
   Record the commands, conflict markers, discussion, resolution, and merge commit in
   `merge-conflict.md`; capture the PR conversation as `merge-conflict.png`.
6. Run `git shortlog -sn --all` and `git rev-list --count --all`. The final history must contain at
   least 35 commits, with each partner at 35% or more.

## 2. Clean-clone Docker evidence

Use a fresh directory, not the existing checkout:

```bash
git clone https://github.com/MugheesHiader476/CivicPulse.git CivicPulse-clean
cd CivicPulse-clean
bash scripts/dev-up.sh
docker compose ps
```

Capture `docker compose ps` with every service healthy/completed as `docker-compose-healthy.png`.
Open both printed URLs and capture a submitted citizen complaint (`citizen-submit.png`) and the
operator board showing the same complaint (`operator-dashboard.png`). Then run:

```bash
curl -i http://127.0.0.1:8000/ready
docker compose images
docker history civicpulse-backend:local
docker history civicpulse-frontend:local
```

Capture readiness as `docker-readiness.png` and image/history output as `docker-images.png`. Record
the measured image sizes and build-context sizes in the report. Finish with `docker compose down`;
do not use `-v` if the seeded database should be retained.

## 3. GitHub Actions, images, and release

1. Open **Actions → CI** for the final PR and capture every job green as `ci-green.png`.
2. Open **Actions → CD** for the merged SHA and capture test, build-push, scan/SBOM, deploy, and
   Ingress smoke jobs green as `cd-green.png`.
3. Open **Packages** and capture both backend/frontend SHA-tagged GHCR images as `ghcr-images.png`.
4. Push a real semantic tag such as `v1.0.0`, open the generated GitHub Release, and capture release
   notes plus both attached SBOMs as `release.png`.

## 4. Kubernetes and autoscaling

Follow `docs/RUNBOOK.md` on kind. Capture these commands and outputs:

```bash
kubectl -n civicpulse get all,ingress,pvc
kubectl -n civicpulse get pods
kubectl -n civicpulse get hpa backend
kubectl -n civicpulse describe hpa backend
kubectl -n civicpulse get vpa backend -o yaml
```

Save the stable deployment as `k8s-resources.png`, probes/rollouts as `k8s-rollouts.png`, initial HPA
as `hpa-before.png`, and VPA recommendations as both `vpa-recommendations.txt` and
`vpa-recommendations.png`.

Run the load test exactly as described in `load/README.md`. Keep these in separate terminals:

```bash
kubectl -n civicpulse get hpa backend -w | tee docs/evidence/hpa-watch.txt
kubectl -n civicpulse get pods -l app.kubernetes.io/name=backend -w
k6 run load/k6-script.js
```

Capture k6 plus the HPA replica increase as `hpa-load.png`. Build `scaling-chart.png` only from the
timestamps in `hpa-watch.txt`, and record the measured scale-up lag in `ENGINEERING-NOTES.md`.
Wait for scale-down and capture `hpa-after.png`. Do not claim autoscaling marks if replicas did not
actually change.

## 5. Application, data, cache, and AI evidence

Capture one clear image for each:

- citizen validation error and successful complaint;
- operator filters, pagination, detail, and valid status transition;
- persisted complaint after a full restart;
- `X-Cache: MISS` followed by `X-Cache: HIT` for stats;
- repeated submission returning `429`;
- selected triage provider and provider outcome history;
- normal AI triage plus rules fallback after a real simulated timeout/failure;
- PostgreSQL/Redis readiness failure or provider failure with structured logs and request ID.

Use browser developer tools or terminal output when a header/log is the evidence. Never expose a
Clerk, Groq, GitHub, database, or session secret in a screenshot.

## 6. Final report and video

Replace every `EVIDENCE PENDING` marker in `SUBMISSION-REPORT.md`, export it to PDF, verify that all
links work, and place the PDF in the final submission. Record a short video that starts with a fresh
clone/start, demonstrates both roles and AI fallback, shows Docker health and Kubernetes scaling,
and ends on the green CI/CD run. Put the unlisted video URL in the report.
