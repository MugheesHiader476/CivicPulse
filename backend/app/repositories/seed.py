from uuid import UUID, uuid5

from sqlalchemy.orm import Session, sessionmaker

from app.providers.triage.rules import RuleBasedTriage
from app.repositories.models import ComplaintRow, utc_now

SEED_NAMESPACE = UUID("dc292d00-fb44-412f-8453-4375317548a7")
SAMPLES = (
    ("Burst water pipe flooding the gali since fajr; pani is entering ground floors.", "water"),
    ("Transformer blast ho gaya; whole block has no bijli and wires are sparking.", "electricity"),
    ("Kachra kundi overflowing near market, bohat badbu and mosquitoes everywhere.", "sanitation"),
    ("Bara khadda on road near U-turn; motorcycles slipped last night.", "roads"),
    ("Street lights of the whole gali band hain, raat ko andhera and chori ka dar.", "streetlights"),
    ("Public park gate is broken and children cannot play safely after school.", "other"),
)
AREAS = ("Samanabad", "Faisal Town", "Gulberg", "Johar Town", "Wapda Town")


def seed(sessions: sessionmaker[Session]) -> int:
    rules = RuleBasedTriage()
    inserted = 0
    with sessions.begin() as session:
        for area in AREAS:
            for index, (text, category) in enumerate(SAMPLES):
                identity = uuid5(SEED_NAMESPACE, f"{area}:{index}")
                if session.get(ComplaintRow, identity):
                    continue
                location = f"Street {index + 1}, {area}, Lahore"
                triage = rules.triage(text, location)
                now = utc_now()
                session.add(ComplaintRow(id=identity, text=text, location=location,
                                         category=category, priority=triage.priority.value, status="open",
                                         ai_summary=triage.summary, triaged_by="rules", triage_latency_ms=0,
                                         created_at=now, updated_at=now))
                inserted += 1
    return inserted
