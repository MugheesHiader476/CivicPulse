# CivicPulse — Software Construction and Design assignment report

**Team:** Faseeh and Mughees Hiader  
**Repository:** <https://github.com/MugheesHiader476/CivicPulse>  
**Final commit:** `EVIDENCE PENDING`  
**Demo video:** `EVIDENCE PENDING`

> This Markdown file is the report source. Insert the real screenshots/links named in
> `EVIDENCE-GUIDE.md`, replace every pending marker, then export to PDF.

## 1. Problem and solution

CivicPulse is a municipal complaint intake and operations system. Citizens describe a problem in
plain language; the backend classifies category and priority, creates a short summary, persists the
report, and keeps intake available through a deterministic rules fallback if an AI provider fails.
Operators filter the city-wide queue, inspect reports, move them through controlled status
transitions, view cached statistics, and choose an available triage provider.

The implementation uses React/TypeScript behind nginx, FastAPI, PostgreSQL, Redis, swappable Groq,
Ollama, simulated, and rules triage providers, Docker Compose, Kubernetes, and GitHub Actions.

## 2. Reproduction

Prerequisites are Git, Docker Desktop, and Bash. From a clean machine:

```bash
git clone https://github.com/MugheesHiader476/CivicPulse.git
cd CivicPulse
bash scripts/dev-up.sh
```

The script generates an ignored local configuration, builds images, starts dependencies, migrates
the schema, seeds data, and prints citizen/operator demo URLs. Local demo authentication requires no
third-party account. Production Compose and Kubernetes force Clerk authentication.

**Clean-clone evidence:** EVIDENCE PENDING (`docker-compose-healthy.png`)

## 3. Architecture and important decisions

The browser calls only same-origin `/api`; nginx or the Ingress routes it to FastAPI. PostgreSQL and
Redis have no public service ports. The backend owns authorization, validation, status transitions,
cache invalidation, rate limiting, and provider fallback. The four ADRs explain provider isolation,
runtime frontend configuration, immutable SHA deployments, and PII/data governance.

**Architecture diagram:** use the Mermaid diagram in the root README.  
**ADR links:** `docs/adr/0001` through `0004`.

## 4. Rubric checklist and evidence

Status meanings: **implemented** means present and locally verified; **external evidence needed**
means the code exists but GitHub/Docker/Kubernetes must actually run; **human action needed** cannot
be truthfully manufactured by automation.

| Rubric area | Points | Current status | Final evidence required |
|---|---:|---|---|
| A. Collaboration and Git | 15 | Human action needed | protected `main`, `dev` + feature branches, ≥5 issue-linked reviewed PRs, ≥35 commits, each partner ≥35%, real conflict |
| B. Frontend | 18 | Implemented; 43 tests pass | citizen/operator screenshots, validation, loading/error/empty states, responsive view |
| C. Backend | 25 | Implemented; 44 tests pass | API demo, validation/status errors, coverage output, structured log/request ID |
| D. Data layer | 12 | Implemented | migration output, persistence after restart, PostgreSQL PVC |
| E. Cache/rate limiting | 10 | Implemented | MISS→HIT, invalidation, Redis persistence/readiness, `429` |
| F. AI subsystem | 25 | Implemented | provider selection, normal result, measured timeout/failure fallback, outcome history |
| G. Docker/Compose | 15 | Implemented; runtime pending here | clean-clone build, healthy stack, image/build-context measurements, isolation |
| H. Kubernetes | 20 | Manifests validate | real kind deployment, probes, PVC, HPA scale up/down, VPA recommendation, scaling chart |
| I. CI/CD | 20 | Workflows lint clean | actual green CI/CD, blocked red merge, GHCR SHA images, release/SBOM, Ingress smoke |
| J. Documentation | 15 | Implemented, evidence pending | completed PDF, working links, screenshots, failure story, demo video |

## 5. Verification summary

- Backend: `44 passed`; 90.61% coverage; Ruff clean; mypy clean.
- Frontend: `43 passed`; ESLint clean; TypeScript and Vite production build clean.
- Kubernetes: dev and prod overlays render; kubeconform finds 15 valid standard resources and skips
  only the external VPA CRD schema.
- GitHub workflows: actionlint clean.
- Docker runtime on clean machine: EVIDENCE PENDING.
- HPA/VPA measured result: EVIDENCE PENDING.

## 6. Collaboration record

At final submission, paste the exact outputs:

```text
git rev-list --count --all
EVIDENCE PENDING

git shortlog -sn --all
EVIDENCE PENDING
```

List at least five issue-linked reviewed PRs:

| Issue | Pull request | Author | Reviewer | What changed |
|---|---|---|---|---|
| EVIDENCE PENDING | EVIDENCE PENDING | EVIDENCE PENDING | EVIDENCE PENDING | EVIDENCE PENDING |

Describe the deliberate conflict, its cause, discussion, and resolution, and link
`docs/evidence/merge-conflict.md`: EVIDENCE PENDING.

## 7. Measured autoscaling result

Environment, load stages, initial replicas, maximum replicas, scale-up lag, peak replicas, and
scale-down time: EVIDENCE PENDING. Insert `scaling-chart.png` and explain only measurements derived
from `hpa-watch.txt`.

## 8. Failure analysis

Describe one real failure observed during implementation: symptom, evidence, root cause, fix, and
regression check. Good candidates are a failing required CI check, a bad Kubernetes rollout, or a
provider timeout. Do not invent a story: EVIDENCE PENDING.

## 9. Security and operations

Secrets are ignored and injected at runtime. Production images are immutable SHA tags; containers
run without root where supported; databases remain on internal networks; probes distinguish
liveness/readiness/startup; resources and disruption budgets are defined; rollback steps are in the
runbook. Local demo tokens work only when `AUTH_MODE=demo`, while production definitions pin
`AUTH_MODE=clerk`.

## 10. AI assistance and ownership

The detailed disclosure is in `docs/AI-USAGE.md`. Faseeh directed the work, decided what entered the
repository, ran or requested validation, and owns the commits and engineering decisions recorded
under his identity. Codex materially assisted with implementation drafts, edits, commands,
verification, explanation, and documentation; it does not claim commit authorship. No commit should
be attributed to a teammate who did not actually create or genuinely review that work.

## 11. Final submission gate

Run `python scripts/check_submission.py`. Submit only when it reports no errors and every evidence
warning has a corresponding real file, the PDF contains no `EVIDENCE PENDING`, all links work, the
video is accessible, and a fresh clone succeeds with the documented command.
