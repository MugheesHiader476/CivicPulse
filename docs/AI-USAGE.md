# AI assistance disclosure

The team used AI as an engineering assistant. Faseeh directed the work, decided what entered the
repository, and owns the resulting commits and engineering decisions. He used the assistant
interactively: he asked what the assignment required, requested explanations and progress updates,
corrected the planned division of commits between partners, and asked why each artifact was needed.

The commits are recorded under the human team members' Git identities, not under an AI identity.
Codex does not claim authorship or ownership of them. This human ownership does not mean there was
no AI involvement: Codex materially assisted by generating implementation drafts, applying edits,
running commands and validation, and explaining trade-offs. AI output was treated as an untrusted
draft; the human authors remain responsible for reviewing every submitted line and for explaining
or modifying it in the viva.

## OpenAI Codex / ChatGPT

### What it assisted Faseeh with

- Audited the 26-page assignment against the repository and converted the rubric into a missing-
  work checklist.
- Assisted with implementing the production Compose file, Kubernetes base/overlays, workload
  probes/resources, HPA/VPA/PDB configuration, kind configuration, and k6 scenario. This included
  generating initial configuration and applying repository edits for Faseeh to review.
- Assisted with implementing CI manifest validation, SHA-tagged GHCR publishing, SBOM/image
  scanning, ephemeral kind deployment, Ingress smoke verification, and tagged-release workflows.
- Drafted ADRs, triage documentation, the operations runbook, engineering notes, README updates,
  and the mechanical submission checker.
- Suggested and ran test/validation commands, answered implementation questions, and explained the
  purpose of each assignment artifact while Faseeh directed the scope.

### What the team changed or verified

- Compared every artifact with the rubric rather than accepting the first draft.
- Kept real secrets outside Kustomize. An early draft applied a placeholder Secret before patching
  it; this was changed so the Secret is created before PostgreSQL or application workloads start,
  preventing database/app password divergence.
- Preserved immutable deployment: images are built once, pushed with the commit SHA, scanned,
  and the same SHA is rendered into Kubernetes. `latest` is never deployed.
- Rendered both Kustomize overlays with Kustomize 5.8.1 and validated the production output with
  kubeconform 0.7.0. The VPA resource is skipped only because it uses an external CRD; the CD job
  installs that CRD/controller before applying it.
- Checked all GitHub workflows with actionlint 1.7.12 and parsed all YAML locally.
- Ran the existing backend suite (41 tests, 90.26% coverage), Ruff, mypy, frontend tests, ESLint,
  and TypeScript checks before extending the deployment work.
- Refused to fabricate HPA/VPA measurements, screenshots, merge evidence, failure history, or a
  partner's Git authorship. Those items must come from real runs and real contributors.

## Human review still required before submission

- Both partners must read every changed file and rehearse the related viva explanation.
- Run the complete workflows on GitHub and a real Docker/kind environment; local static checks do
  not prove a rollout or autoscaling event.
- Replace the two clearly marked evidence placeholders in `docs/ENGINEERING-NOTES.md` with actual
  measurements and the team's real failure account.
- Add any other AI tools or conversations used for the earlier frontend/backend work. Do not imply
  that this file covers tools that were not disclosed to the reviewer who drafted it.
