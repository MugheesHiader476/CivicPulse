from app.providers.triage.rules import RuleBasedTriage
from app.schemas import TriageResult


class SimulatedTriage:
    name = "simulated"

    def __init__(self, failure: str = ""):
        self.failure = failure
        self.rules = RuleBasedTriage()

    def triage(self, text: str, location: str) -> TriageResult:
        if self.failure == "raise":
            raise RuntimeError("Simulated failure")
        if self.failure == "malformed":
            return TriageResult.model_validate({"category": "invalid", "priority": "high", "summary": "Bad", "confidence": 1})
        return self.rules.triage(text, location)
