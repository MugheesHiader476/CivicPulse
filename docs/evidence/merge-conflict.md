# Real-code merge conflict and resolution

## Competing branches

- `fix/category-word-boundaries` (`f7fd271`, Faseeh) used explicit negative lookaround boundaries.
- `fix/category-token-scoring` (`561ec89`, Mughees) used a compact `\b`-based score helper.

Both branches fixed the same real defect: the category keyword `road` was previously matched as an
arbitrary substring, so a complaint about `broadband` could be misclassified as a roads complaint.
Each branch independently changed `backend/app/providers/triage/rules.py` and added
`backend/tests/test_rules.py` from the same `dev` base.

## Command and conflict output

After PR #13 was reviewed and merged into `dev`, Mughees updated the competing branch with:

```text
git fetch origin
git switch fix/category-token-scoring
git merge origin/dev

Auto-merging backend/app/providers/triage/rules.py
CONFLICT (content): Merge conflict in backend/app/providers/triage/rules.py
Auto-merging backend/tests/test_rules.py
CONFLICT (add/add): Merge conflict in backend/tests/test_rules.py
Automatic merge failed; fix conflicts and then commit the result.
```

Git reported the two unresolved paths as:

```text
UU backend/app/providers/triage/rules.py
AA backend/tests/test_rules.py
```

The production-code marker showed the competing implementations:

```python
  <<<<<<< HEAD
def _category_score(text: str, terms: tuple[str, ...]) -> int:
    return sum(len(term) for term in terms if re.search(rf"\b{re.escape(term)}\b", text))
  =======
def _contains_category_term(text: str, term: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) is not None
  >>>>>>> origin/dev
```

## Resolution decision

The resolved version keeps Faseeh's negative-lookaround matcher because it states both term edges
explicitly and does not inherit `\b`'s less obvious behavior around underscores and Unicode word
characters. Mughees's stronger `service road` regression input was retained, so the resolution
combines the safer implementation with useful coverage from the competing branch. This version won
because its boundary behavior is easier to defend and maintain, not because of branch ownership.

## Verification

The resolved branch passed 46 backend tests with 90.64% application coverage. Ruff reported no
violations, and mypy reported no issues in 24 source files before PR #15 was updated for review.
