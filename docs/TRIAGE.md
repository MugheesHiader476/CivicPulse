# Triage design and operations

## Stable contract

All classifiers implement `TriageProvider.triage(text, location) -> TriageResult`. The result is
validated against category, priority, 140-character summary, and confidence constraints before
it can be persisted. Routes depend on `ComplaintService`, not on a provider SDK.

| Provider | Name stored | Purpose | External data |
|---|---|---|---|
| Groq | `llm:groq` | Hosted production option | Complaint text only |
| Ollama | `llm:ollama` | Offline local option | Nothing leaves the machine |
| Rules | `rules` | Deterministic offline choice | None |
| Simulated | `simulated` | Deterministic CI path and fault injection | None |
| Rules fallback | `rules:fallback` | Result after another provider fails | None after failure |

The operator selects Groq or Ollama through the provider endpoint. The choice is stored in Redis
so all backend replicas agree. `TRIAGE_PROVIDER` is the bootstrap value before an operator choice
exists.

## Failure behavior

Each model request has a 10-second hard timeout. A timeout, HTTP 429, or HTTP 5xx becomes
`RetryableTriageError`; the service retries once after 50-200 ms of jitter. Authentication,
request, and schema errors are not retried. Any final error produces a rule-based result and a
successful complaint response with `triaged_by=rules:fallback`.

One structured WARNING records the request ID, complaint ID, provider, and exception class. It
never records complaint text, contact details, or credentials. Prometheus exposes triage latency,
fallback count, and cache hit/miss counters. Operators can inspect the last 20 persisted outcomes
through `/api/meta/providers`.

## Prompt-injection boundary

Complaint text is serialized as data under `complaint_data`, separated from the system message,
and explicitly described as untrusted. Provider output is constrained to JSON and validated
again with Pydantic. `backend/tests/test_api.py::test_prompt_injection_does_not_override_category`
submits an instruction-like complaint and verifies that it cannot escape the category schema.

## Content cache

The Redis key is a SHA-256 hash of provider name, model, normalized complaint text, and normalized
location. The 24-hour entry stores only the validated result and provider name. Provider/model
scope prevents an operator switch from reusing a result produced by a different classifier.
Fallbacks are not cached, so a temporary outage does not poison the cache for a day.

To measure the required hit rate, submit a recorded mix containing both unique and duplicate
complaints, then calculate `hit / (hit + miss)` from `civicpulse_triage_cache_total` before and
after the run. Record the workload, raw counter values, and result in `docs/evidence/`; do not
claim a rate from seeded or invented data.

## Data governance

Groq receives only complaint text. Reporter contact and location are deliberately excluded from
the hosted request. The API key stays in an environment variable/Kubernetes Secret and never
reaches the browser or a log. See `docs/adr/0004-pii-and-data-governance.md` for the decision and
retention trade-offs.
