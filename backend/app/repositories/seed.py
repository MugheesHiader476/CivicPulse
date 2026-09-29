from uuid import UUID, uuid5

from sqlalchemy.orm import Session, sessionmaker

from app.providers.triage.rules import RuleBasedTriage
from app.repositories.models import ComplaintRow, utc_now

SEED_NAMESPACE = UUID("dc292d00-fb44-412f-8453-4375317548a7")
# Thirty distinct reports in Urdu-influenced English, five per category.
SAMPLES = (
    ("Burst water main flooding Street 12 since fajr; pani is entering ground floors.", "Street 12, Samanabad", "water"),
    ("Nalka has been dry for three days in our lane, families are buying tanker water.", "Block C, Faisal Town", "water"),
    ("Pipe leak near the masjid is wasting clean water all day and the road is slippery.", "Main Boulevard, Gulberg III", "water"),
    ("Pani supply comes dirty and smelly, children falling sick after drinking this water.", "Mohalla Islampura, Lahore", "water"),
    ("Water tanker promised by the society has not come for a week, kindly send it.", "Sector D, Johar Town", "water"),
    ("Transformer blast ho gaya last night; whole block has no bijli and wires are sparking.", "Block H, Wapda Town", "electricity"),
    ("Live wire hanging low over the school gate, danger for kids every morning.", "Canal View Road, Lahore", "electricity"),
    ("Voltage keeps dropping every evening and fridges and fans are getting damaged.", "Street 4, Garden Town", "electricity"),
    ("Bijli has been gone for eighteen hours in our mohalla with no load-shedding notice.", "Shadman Colony, Lahore", "electricity"),
    ("Electric pole is leaning after the storm and the current wire touches a tree.", "Ferozepur Road, Ichhra", "electricity"),
    ("Kachra kundi near the market is overflowing, bohat badbu and mosquitoes everywhere.", "Anarkali Bazaar, Lahore", "sanitation"),
    ("Sewer line choked, gutter water standing in the street for four days now.", "Street 9, Mughalpura", "sanitation"),
    ("Garbage van has not collected trash from our lane for two weeks.", "Block F, Model Town", "sanitation"),
    ("Open drain beside the primary school smells terrible and nobody cleans it.", "Kot Lakhpat, Lahore", "sanitation"),
    ("Dead dog lying near the park and trash piled around it, badbu is unbearable.", "Township Sector B, Lahore", "sanitation"),
    ("Bara khadda on the road near the U-turn; two motorcycles slipped last night.", "Jail Road U-turn, Lahore", "roads"),
    ("Manhole cover missing on the main sarak, very dangerous for cars at night.", "College Road, Township", "roads"),
    ("Pothole in front of the hospital gate is making ambulances slow down.", "Jail Road near Services Hospital", "roads"),
    ("Footpath tiles are uneven outside the bank, minor issue but please fix when possible.", "Liberty Market, Gulberg", "roads"),
    ("Road carpeting left half done after a month; gravel is flying onto bikes.", "Raiwind Road, Lahore", "roads"),
    ("Street lights of the whole gali band hain, raat ko andhera and chori ka dar.", "Street 7, Samanabad", "streetlights"),
    ("Streetlight outside the girls college has been off for two weeks.", "Queens Road, Lahore", "streetlights"),
    ("Lamp posts on the service lane flicker all night and then go dark.", "Service Lane, DHA Phase 4", "streetlights"),
    ("Every streetlight in the park is broken, families cannot walk there after maghrib.", "Jilani Park, Lahore", "streetlights"),
    ("Two street light poles fell during the storm and the corner is completely dark.", "Chowk Yateem Khana, Lahore", "streetlights"),
    ("Public park gate is broken and children cannot play safely after school.", "Model Town Park, Lahore", "other"),
    ("Stray dogs chasing children near the bus stop every morning, please help.", "Thokar Niaz Baig, Lahore", "other"),
    ("Loudspeaker from the marriage hall plays till 3 am daily, nobody can sleep.", "Canal Bank Road, Lahore", "other"),
    ("Illegal encroachment by shops has blocked half the bazaar lane.", "Shah Alam Market, Lahore", "other"),
    ("Minor crack in the community centre wall paint, please repaint when possible.", "Allama Iqbal Town, Lahore", "other"),
)


def seed(sessions: sessionmaker[Session]) -> int:
    rules = RuleBasedTriage()
    inserted = 0
    with sessions.begin() as session:
        for index, (text, location, category) in enumerate(SAMPLES):
            # Deterministic IDs make the seed idempotent: a second run finds every row and skips it.
            identity = uuid5(SEED_NAMESPACE, f"complaint:{index}")
            if session.get(ComplaintRow, identity):
                continue
            triage = rules.triage(text, location)
            now = utc_now()
            session.add(ComplaintRow(id=identity, text=text, location=location,
                                     category=category, priority=triage.priority.value, status="open",
                                     ai_summary=triage.summary, triaged_by="rules", triage_latency_ms=0,
                                     created_at=now, updated_at=now))
            inserted += 1
    return inserted
