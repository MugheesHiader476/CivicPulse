# ADR 0003: Build once and deploy the commit SHA

- Status: Accepted
- Date: 2026-09-28

## Context

A mutable tag such as `latest` cannot answer which source revision is running, and rebuilding an
image during deployment can produce different bytes from the artifact that passed testing.
Rollback must identify one previous artifact without guessing.

## Decision

On every push to `main`, `.github/workflows/cd.yml` runs the complete test gate before the
`build-push` job. That job builds each image once and pushes both `${{ github.sha }}` and
`latest`. It exports the registry digest for audit and SBOM generation. The deployment job has
`needs: build-push`, pulls the SHA-tagged images, loads those exact images into kind, replaces
the Kustomize placeholders with `${GITHUB_SHA}`, and applies the rendered result.

`latest` is a convenience for humans and is never referenced by Compose production deployment,
Kubernetes overlays, or the deployment job. A tagged release publishes semantic-version aliases,
but it is separately gated by its own test job.

## Alternatives considered

- Deploy `latest`. Rejected because the tag moves and makes rollback and incident review
  ambiguous.
- Rebuild inside the deploy job. Rejected because it violates build-once-deploy-many and can
  deploy bytes that were never scanned.
- Commit a different manifest for every SHA. Rejected for this assignment because the ephemeral
  cluster can render the immutable reference without creating automated commit noise.

## Consequences

`git show <sha>` identifies the source for a running image, and the CD run records its digest.
Rollback can use `kubectl rollout undo` immediately or re-render the previous SHA for an
auditable recovery. GHCR retention must preserve the SHA tags needed by the rollback window.
