# ADR 0004: Complaint data sent to hosted triage

Status: accepted for this implementation.

The default provider is local deterministic rules, so no complaint leaves the machine. If an
operator configures a Groq key and selects Groq (through the initial `TRIAGE_PROVIDER=llm`
setting or the operator-only UI), the backend sends only the complaint body to Groq for
classification. The optional reporter contact and separate
location field are not sent. Complaint bodies can themselves contain names or addresses, so
this is still personal-data exposure. Operators should use the rules or local Ollama provider
where that exposure is unacceptable; no claim of full anonymization is made.

The key is read from environment variables and never appears in frontend code, responses,
logs, or committed configuration. The model response is parsed and validated against the
category, priority, summary-length and confidence schema before persistence. If the remote
service fails, the backend falls back to local rules and logs only the error class.
