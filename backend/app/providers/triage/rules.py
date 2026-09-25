import re

from app.schemas import Category, Priority, TriageResult

KEYWORDS = {
    Category.water: ("water", "pani", "pipe", "leak", "flood", "tanker", "nalka"),
    Category.electricity: ("bijli", "electric", "transformer", "wire", "voltage", "spark", "current"),
    Category.sanitation: ("kachra", "garbage", "gutter", "sewer", "drain", "badbu", "trash"),
    Category.roads: ("road", "sarak", "khadda", "pothole", "footpath", "manhole"),
    Category.streetlights: ("streetlight", "street light", "lamp", "dark", "andhera"),
}
HIGH = ("flood", "danger", "blast", "spark", "live wire", "fire", "injur", "accident", "hospital")
LOW = ("minor", "when possible", "cosmetic")
INJECTION = re.compile(r"(?:ignore|disregard|forget)\b[^.\n]*(?:instruction|prompt|rules|mark this as)[^.\n]*\.?", re.IGNORECASE)


class RuleBasedTriage:
    name = "rules"

    def triage(self, text: str, location: str) -> TriageResult:
        clean = " ".join(INJECTION.sub("", text).split())
        lowered = clean.lower()
        scores = {category: sum(len(word) for word in words if word in lowered) for category, words in KEYWORDS.items()}
        category = max(scores, key=scores.get) if any(scores.values()) else Category.other
        priority = Priority.high if any(word in lowered for word in HIGH) else Priority.low if any(word in lowered for word in LOW) else Priority.normal
        summary = f"{category.value.title()} issue at {location}: {clean.split('.')[0].strip()}"
        return TriageResult(category=category, priority=priority, summary=summary[:140], confidence=0.5)
