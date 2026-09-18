import re

# Naive but effective for a demo: split on sentence-ending punctuation followed
# by whitespace. Good enough for the short LLM answers this API verifies --
# a full clause-level claim decomposer (like the reference repo's LLM-based
# approach) is a natural next step but overkill for tomorrow's presentation.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def split_into_claims(answer: str) -> list[str]:
    text = answer.strip()
    if not text:
        return []
    parts = [p.strip() for p in _SENTENCE_SPLIT_RE.split(text) if p.strip()]
    return parts or [text]
