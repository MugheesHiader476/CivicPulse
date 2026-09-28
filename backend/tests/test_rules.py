from app.providers.triage.rules import RuleBasedTriage
from app.schemas import Category


def test_unrelated_substrings_do_not_trigger_a_category() -> None:
    result = RuleBasedTriage().triage("Broadband internet is unavailable", "Town Centre")

    assert result.category is Category.other


def test_category_scoring_keeps_phrase_and_token_matches() -> None:
    triage = RuleBasedTriage()

    assert triage.triage("The street light is dark", "Block B").category is Category.streetlights
    assert triage.triage("Pothole on the service road", "Canal Road").category is Category.roads
