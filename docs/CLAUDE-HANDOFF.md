# Claude handoff prompt - continue after the demo video is recorded

Copy everything inside the following block into Claude. Replace `<UNLISTED_VIDEO_URL>` with the
actual accessible link before sending it.

```text
Continue and finish my CS4032 Software Construction and Design Assignment 1 project, CivicPulse.
Work carefully from the real repository state and rubric evidence. Do not fabricate screenshots,
pipeline results, reviews, commits, authorship, measurements, or links.

Repository and assignment
- Local repository: D:\SCD\CivicPulse
- GitHub: https://github.com/MugheesHiader476/CivicPulse
- Assignment PDF: C:\Users\fasee\Downloads\Software Construction and Design -  Assignment 1 (1).pdf
- Main editable report source: D:\SCD\CivicPulse\docs\SUBMISSION-REPORT.md
- Demo video: <UNLISTED_VIDEO_URL>
- Final report should remain in Markdown in Git and also be exported as a polished PDF containing
  the unique evidence screenshots, captions, measurements, and clickable source links.

What CivicPulse does
- React/Vite/TypeScript frontend served by nginx.
- FastAPI backend with PostgreSQL 16 and Redis 7.
- Citizen complaint intake and tracking; operator dashboard, workflow, and live statistics.
- Replaceable Groq, Ollama, simulated, and deterministic-rules triage providers.
- AI output validation, timeout/retry/fallback, content-hash cache, rate limiting, and request IDs.
- Docker Compose and Kubernetes kind deployment with Ingress, PVCs, HPA, VPA, and PDB.
- GitHub Actions CI, CD, and release workflows.

Verified technical state
- Backend: 44 tests passed with 90.61% coverage.
- Frontend: 43 tests passed; lint, type check, and build passed.
- Green CI run for dev commit 471f524:
  https://github.com/MugheesHiader476/CivicPulse/actions/runs/36442947082
- CD workflow exists but has NOT yet produced the final successful main run:
  https://github.com/MugheesHiader476/CivicPulse/actions/workflows/cd.yml
- Clean-clone Compose startup was verified with healthy frontend/backend/PostgreSQL/Redis.
- Kubernetes was verified with two backend pods, two frontend pods, PostgreSQL, Redis, Ingress,
  bound PVCs, HPA, and VPA.
- Real k6 result: 150,559 requests, zero failures, p95 252.38 ms. HPA scaled under load.
- Main ruleset ID 24126462 is active: PR required, one approval, last-push approval, resolved
  conversations, all nine CI checks, deletion blocked, and non-fast-forward/force push blocked.

Evidence already stored under docs/evidence
- Application: citizen-submit.png, operator-dashboard.png, operator-stats-charts.png,
  triage-pipeline.png, provider-selector.png, status-transition.png,
  invalid-status-transition.png, validation-error.png, rate-limit.png.
- Cache: redis-cache-miss.png and redis-cache-hit.png.
- Docker: docker-compose-healthy.png and docker-images.png.
- Kubernetes: k8s-resources.png, hpa-load.png, hpa-watch.txt, hpa-timeline.csv,
  k6-summary.txt, vpa-recommendations.txt, and scaling-chart.png.
- CI: ci-green.png.
- A branch-protection screenshot still needs to be saved as docs/evidence/branch-protection.png.

Git and collaboration state
- Never push directly to main.
- dev currently points to 471f524 before the open documentation PRs are merged.
- Merged PR #1 exists.
- Open PR #3: docs/evidence-catalog -> dev, linked to Issue #2.
- Open PR #5: docs/demo-runbook -> dev, linked to Issue #4.
- Open PR #7: docs/video-commands -> dev, linked to Issue #6.
- A separate Claude-handoff PR is expected from branch docs/claude-handoff.
- After that PR exists, there will be five total PRs counting merged PR #1, but every open PR must
  receive a substantive review comment from Faseeh and be merged to count for the rubric.
- Before the handoff commit, all refs contained 47 unique commits: Faseeh 30, Mughees 17. After the
  handoff commit, expect 48 total: Faseeh 30, Mughees 18 (37.5%). Recalculate with:
    git rev-list --count --all
    git shortlog -sne --all
- Active GitHub CLI account at handoff was MugheesHiader476. Repository-local author was:
    Mughees Hiader <i243181@isb.nu.edu.pk>
- Do not attribute AI-created or another person's work falsely. The partners must genuinely review
  and understand their contributions. Preserve docs/AI-USAGE.md and make it honest: the students
  made/authorized commits; AI assisted implementation, Docker/CD work, questions, documentation,
  and debugging.

Runtime state at handoff
- Docker Desktop is running.
- Compose is stopped because Compose and the kind Ingress compete for host port 8080.
- Saved kind cluster civicpulse is running in container civicpulse-control-plane.
- Kubernetes context: kind-civicpulse.
- CivicPulse pods were Ready after recovery.
- A temporary port-forward was running in the previous assistant session at 127.0.0.1:8081. It may
  not survive the handoff. Recreate it with:
    kubectl -n civicpulse port-forward service/frontend 8081:8080
- Operator URL: http://127.0.0.1:8081/?demo_role=operator
- Video instructions: docs/DEMO-SCRIPT.md and docs/demo-commands/.

Required work after receiving the video URL
1. Verify and save the branch-protection screenshot if not already present.
2. Switch to Faseeh's GitHub account only with his authorization. Have Faseeh leave a substantive,
   technically specific review comment and approval on PRs #3, #5, #7, and the handoff PR. Merge
   them to dev in an order that avoids losing files. Do not approve a user's own PR.
3. Satisfy the rubric's deliberate merge-conflict requirement on real code. Use two legitimate
   feature branches that change the same real line, show conflict markers/resolution, discuss why
   the chosen version wins, and save real evidence. Do not invent a conflict screenshot.
4. Create the final dev -> main PR. The rubric requires real evidence of a deliberately failing
   required check blocking merge, then a fix in the SAME PR and a green result. Perform a harmless,
   controlled failure, capture blocked-merge.png, fix it, capture green-pipeline.png, and preserve
   a truthful history. Watch author percentages if adding commits.
5. Merge only through protected main after partner review and all required checks pass.
6. Monitor the resulting CD run through test, build-push, scans/SBOM, deploy-k8s, and Ingress smoke.
   Save the direct successful run URL and docs/evidence/cd-green.png.
7. Verify both SHA-tagged GHCR images and save their links plus ghcr-images.png.
8. Create a real semantic tag such as v1.0.0 only after main/CD are final. Monitor release.yml,
   verify generated notes and both SBOM attachments, and save release.png plus the release URL.
9. Insert the unlisted video URL, final commit SHA, CI/CD links, GHCR links, PR/Issue links, author
   shortlog, measurements, and screenshots into docs/SUBMISSION-REPORT.md. Remove every
   EVIDENCE PENDING marker using only real evidence.
10. Run python scripts/check_submission.py and fix legitimate failures without weakening checks.
11. Export a polished PDF report. Render every page to PNG, visually inspect for clipped text,
    broken tables, unreadable screenshots, bad page breaks, and non-working links, then correct it.
12. Give me the final GitHub repository, green CD run, both GHCR package links, release link, PDF,
    shortlog output, and a concise submission checklist.

Important cautions
- Preserve existing user changes and evidence; do not reset or rewrite history destructively.
- Never expose or commit credentials, tokens, .env files, database passwords, or private keys.
- Do not call a workflow green until GitHub reports success.
- Do not create fake reviews or commits for either partner.
- Do not deploy :latest; production and rollback must use immutable SHA tags.
- The report must say what actually happened, not what was merely configured.
```
