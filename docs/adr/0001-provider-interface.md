# ADR 0001: Put triage providers behind one validated interface

- Status: Accepted
- Date: 2026-09-24

## Context

CivicPulse must classify a complaint with a hosted model, a local model, deterministic rules,
or a deterministic CI fake. Provider availability, latency, output quality, and cost differ, but
the HTTP, service, and persistence layers should not branch on vendor-specific response shapes.
Model output is untrusted even when JSON mode is requested.

## Decision

Every implementation satisfies `TriageProvider` in `backend/app/providers/triage/base.py` and
returns the same Pydantic `TriageResult`. `ComplaintService` chooses a provider once per request,
validates the returned object again, retries only `RetryableTriageError` once with jitter, and
falls back to `RuleBasedTriage` for every provider failure. `ProviderSelector` owns runtime
selection; routes and repositories do not know which provider was used.

The provider name and latency are persisted with the complaint. The last 20 outcomes form the
operator observability view. CI selects `SimulatedTriage`, so tests never depend on a network or
probabilistic output.

## Alternatives considered

- Call Groq directly from the route. Rejected because it couples HTTP behavior to one vendor and
  makes fallback, deterministic testing, and an offline path difficult.
- Let each provider return its native JSON. Rejected because validation and category rules would
  leak into the service and frontend.
- Retry every error. Rejected because a malformed request or authentication failure will not
  become valid on a second attempt and would waste quota.

## Consequences

Adding a classifier requires a small adapter rather than changes throughout the application.
The stable contract makes deterministic failure injection possible. The trade-off is that
vendor-specific features are intentionally hidden unless the common result model is extended.
