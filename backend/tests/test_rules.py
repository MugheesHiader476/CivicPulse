from app.providers.triage.rules import RuleBasedTriage
from app.schemas import Category


def test_category_keywords_do_not_match_inside_unrelated_words() -> None:
    result = RuleBasedTriage().triage("Broadband service has been unavailable since morning", "Model Town")

    assert result.category is Category.other


def test_multiword_and_whole_word_road_terms_still_match() -> None:
    provider = RuleBasedTriage()

    assert provider.triage("Street light is dark", "Block A").category is Category.streetlights
    assert provider.triage("Pothole on the service road", "Canal Road").category is Category.roads
