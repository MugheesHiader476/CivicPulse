# Mughees handoff: three genuine contributions

After the two remaining Faseeh commits, the repository will have 32 commits: 22 by Faseeh and 10
by Mughees. At exactly 35 total commits, Mughees needs three additional genuine commits to reach
13/35 (37.1%), while Faseeh has 22/35 (62.9%). Do not add more Faseeh commits before these three or
the planned distribution changes.

These tasks are intentionally based on real verification and review. Mughees must perform the run,
inspect the result, choose the change, and make the commit. Changing only the author field would be
false evidence and would not satisfy the assignment's collaboration requirement.

## Commit 1 — clean-clone deployment verification

1. Create an Issue titled `Verify zero-secret clean-clone Docker startup` and assign Mughees.
2. Mughees clones into a fresh directory and follows section 2 of `EVIDENCE-GUIDE.md`.
3. He records the tested commit SHA, operating system, Docker versions, start/end time, service
   health, image sizes, and any problem/fix in `docs/evidence/docker-clean-start.txt`.
4. He updates the Docker measurement row in `SUBMISSION-REPORT.md` and commits:

```text
test(deployment): verify clean-clone compose startup
```

Open a PR with `Closes #<issue>` and have Faseeh review it.

## Commit 2 — measured Kubernetes scaling

1. Create an Issue titled `Measure HPA and VPA behavior under k6 load` and assign Mughees.
2. Mughees follows the runbook and section 4 of `EVIDENCE-GUIDE.md` after Docker works.
3. He commits the real `hpa-watch.txt`, `vpa-recommendations.txt`, `scaling-chart.png`, and measured
   lag in `ENGINEERING-NOTES.md`. If replicas do not change, he diagnoses and fixes the real cause
   instead of inventing a graph.
4. Commit:

```text
test(k8s): record measured autoscaling behavior
```

Open a PR with `Closes #<issue>` and have Faseeh review it.

## Commit 3 — substantive independent review fix

1. Create an Issue titled `Review production deployment boundary` and assign Mughees.
2. Mughees reviews `compose.prod.yaml`, `k8s/`, `.github/workflows/cd.yml`, and the Clerk/demo auth
   boundary. He writes the finding in the Issue and makes one real code, test, security, or runbook
   improvement supported by that finding.
3. Run the relevant checks and commit with the appropriate conventional prefix, for example:

```text
fix(deploy): <describe the actual reviewed defect>
```

Open a PR with `Closes #<issue>` and have Faseeh review it. This PR must describe the actual finding;
do not use the example text as if it were evidence.

## Final check

After all three PRs are merged, run:

```bash
git rev-list --count --all
git shortlog -sn --all
python scripts/check_submission.py
```

Expected minimum distribution at exactly 35 commits: Faseeh 22 (62.9%), Mughees 13 (37.1%). The
other collaboration requirements—five total issue-linked reviewed PRs, branch protection, and one
recorded conflict—still need their own real GitHub evidence.
