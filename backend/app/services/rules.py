"""Deterministic rule-based fallback classifier.

Used whenever the Gemini call is unavailable or fails (no API key, quota hit,
network blip) so the demo keeps working live. It is intentionally simple:
regex-based number/date/entity overlap checks, not a real NLI model."""

import re

NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?%?")
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
CAPWORD_RE = re.compile(r"\b[A-Z][a-zA-Z]{2,}\b")
# Common words that get capitalized purely because they start a sentence,
# not because they're proper nouns -- excluded from entity extraction so
# e.g. "During the monsoon..." doesn't flag "During" as an unmatched entity.
STOPWORDS = {
    "The", "This", "That", "These", "Those", "It", "In", "On", "At",
    "A", "An", "And", "Or", "But", "If", "So", "As", "By", "For",
    "During", "After", "Before", "While", "Since", "Although", "However",
    "Furthermore", "Additionally", "Moreover", "Meanwhile", "Therefore",
    "Because", "When", "Where", "Which", "Who", "What", "There", "Here",
    "Also", "Then", "Thus", "Unlike", "Despite", "Within", "Across", "Amid",
    "Given", "Following", "According", "Both", "Each", "Every", "Many",
    "Some", "Most", "All", "Several", "Overall", "Currently", "Recently",
    "Today", "Now", "Later", "First", "Second", "Third", "Finally", "Next",
    "Under", "Over", "Between", "Among", "Without", "With", "Instead", "Not",
    "Regarding", "Notably", "Importantly", "Interestingly",
}

# Crude polarity/negation cue words. Catches the common "X was not really a
# great guy" vs "X was a great guy" case, which plain word-overlap scoring is
# blind to (the negation is a single low-weight token among many shared
# words, so overlap-based coverage still looks high).
NEGATION_RE = re.compile(
    r"\b(not|never|no|none|nobody|nothing|neither|nor|cannot|isn't|wasn't|weren't|aren't|"
    r"doesn't|didn't|don't|won't|can't|hasn't|haven't|hadn't|shouldn't|wouldn't|couldn't)\b",
    re.IGNORECASE,
)

# Words that qualify a number's actual meaning -- if the number matches
# between claim and context but its qualifier doesn't ("450 million USD" vs
# "450 million INR", or "450 million" vs "450 billion"), the claim is
# numerically wrong even though the bare digits "450" are identical. This is
# a single general mechanism (not a one-off "USD vs INR" special case): any
# number-adjacent word in this set is compared, currencies and magnitude
# words alike, and it extends to whatever unit words are added below.
CURRENCY_QUALIFIERS = {
    "usd", "inr", "eur", "gbp", "jpy", "cny", "aud", "cad", "chf", "sgd", "aed", "hkd", "nzd",
    "dollar", "dollars", "rupee", "rupees", "euro", "euros", "pound", "pounds", "yen", "yuan",
    "franc", "francs", "$", "€", "£", "¥", "₹",
}
MAGNITUDE_QUALIFIERS = {
    "hundred", "thousand", "lakh", "lakhs", "million", "millions",
    "crore", "crores", "billion", "billions", "trillion", "trillions",
}
UNIT_QUALIFIERS = {
    "kg", "kilogram", "kilograms", "gram", "grams", "lb", "lbs", "pound", "pounds",
    "km", "kilometer", "kilometers", "mile", "miles", "m", "meter", "meters",
    "celsius", "fahrenheit", "kmph", "mph",
}
# Kept as separate categories (not one flat set) deliberately: "450 million
# USD" vs "450 million INR" share "million", and a flat-set overlap check
# would see that shared word and wrongly call it a match. Comparing
# currency-vs-currency, magnitude-vs-magnitude, unit-vs-unit independently is
# what actually catches the currency/magnitude/unit swapping out from under
# a shared word in a different category.
QUALIFIER_CATEGORIES = {
    "currency": CURRENCY_QUALIFIERS,
    "magnitude": MAGNITUDE_QUALIFIERS,
    "unit": UNIT_QUALIFIERS,
}

FUNCTION_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "will", "would",
    "shall", "should", "can", "could", "may", "might", "must", "in", "on", "at", "to", "of",
    "and", "or", "but", "if", "so", "as", "by", "for", "with", "from", "that", "this", "these",
    "those", "it", "its", "his", "her", "their", "they", "he", "she", "we", "you", "i",
}


def _stem(word: str) -> str:
    """Crude suffix stripper so "rate"/"rates", "guarantee"/"guaranteed" etc.
    overlap -- exact-token word-overlap otherwise misses these almost every
    time, since an LLM's answer is rarely a verbatim copy of the context."""
    w = word.lower()
    if len(w) > 5 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 5 and w.endswith("ing"):
        return w[:-3]
    if len(w) > 4 and w.endswith("ed"):
        return w[:-2]
    if len(w) > 4 and w.endswith("es"):
        return w[:-2]
    if len(w) > 4 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


def _content_stems(text: str) -> set[str]:
    words = re.findall(r"[A-Za-z]+", text.lower())
    return {_stem(w) for w in words if w not in FUNCTION_WORDS}


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _best_matching_sentence(claim: str, context: str) -> str:
    """The context sentence with the most content-word overlap with the
    claim -- used to localize negation/polarity checks so an unrelated
    negation elsewhere in a multi-sentence context doesn't misfire on a
    claim it has nothing to do with."""
    sentences = _split_sentences(context)
    if len(sentences) <= 1:
        return context
    claim_stems = _content_stems(claim)
    best_sentence, best_overlap = sentences[0], -1
    for sentence in sentences:
        overlap = len(claim_stems & _content_stems(sentence))
        if overlap > best_overlap:
            best_overlap = overlap
            best_sentence = sentence
    return best_sentence


def _numbers_in(text: str) -> set[str]:
    # Exclude bare 4-digit years so a date mismatch (e.g. "2025" vs "2024")
    # is classified as temporal_mismatch, not numerical_mismatch.
    return {n for n in NUMBER_RE.findall(text) if not re.fullmatch(r"(?:19|20)\d{2}", n)}


def _number_qualifiers(text: str) -> dict[str, dict[str, set[str]]]:
    """Maps each number token to its qualifier words, BY CATEGORY, found
    immediately around it -- e.g. "450 million USD" ->
    {"450": {"currency": {"usd"}, "magnitude": {"million"}, "unit": set()}}."""
    result: dict[str, dict[str, set[str]]] = {}
    for m in NUMBER_RE.finditer(text):
        num = m.group()
        if re.fullmatch(r"(?:19|20)\d{2}", num):
            continue
        before = text[max(0, m.start() - 15) : m.start()]
        after = text[m.end() : m.end() + 25]
        nearby_words = {w.lower() for w in re.findall(r"[A-Za-z]+", before + " " + after)}
        entry = result.setdefault(num, {cat: set() for cat in QUALIFIER_CATEGORIES})
        for category, vocab in QUALIFIER_CATEGORIES.items():
            entry[category] |= nearby_words & vocab
    return result


def _years_in(text: str) -> set[str]:
    return set(YEAR_RE.findall(text))


def _proper_nouns_in(text: str) -> set[str]:
    """Words that look like proper nouns: capitalized and not a known
    non-entity word. Deliberately an explicit stopword list rather than a
    "only counts if it also appears capitalized outside sentence-initial
    position" heuristic -- that position-based rule sounds appealing but
    silently drops any real proper noun that happens to start a sentence
    and is only mentioned once (e.g. "Samsung released..."), which breaks
    entity-mismatch detection on exactly the answers most likely to open
    with the (possibly wrong) subject."""
    return {w for w in CAPWORD_RE.findall(text) if w not in STOPWORDS}


def rule_based_score(claim: str, context: str) -> dict:
    claim_numbers = _numbers_in(claim)
    context_numbers = _numbers_in(context)
    unmatched_numbers = claim_numbers - context_numbers

    claim_years = _years_in(claim)
    context_years = _years_in(context)
    unmatched_years = claim_years - context_years

    claim_entities = _proper_nouns_in(claim)
    # Case-insensitive match against the full context, not just other
    # capitalized words in it -- a claim's sentence-initial or reworded
    # capitalization shouldn't count as a "different" entity.
    context_words_lower = {w.lower() for w in re.findall(r"[A-Za-z]+", context)}
    unmatched_entities = {w for w in claim_entities if w.lower() not in context_words_lower}

    if unmatched_numbers:
        others = ", ".join(sorted(context_numbers)) or "no comparable figures"
        return {
            "risk_score": 88.0,
            "error_type": "numerical_mismatch",
            "evidence": f"Context contains different figures: {others}.",
        }

    # The bare digits match (so unmatched_numbers didn't catch anything) but
    # a shared number's qualifier disagrees -- e.g. claim "450 million INR"
    # vs context "450 million USD", or claim "450 million" vs context
    # "450 billion". Same digits, very different real quantity.
    claim_qualifiers = _number_qualifiers(claim)
    context_qualifiers = _number_qualifiers(context)
    for num, cats in claim_qualifiers.items():
        ctx_cats = context_qualifiers.get(num)
        if not ctx_cats:
            continue
        for category in QUALIFIER_CATEGORIES:
            claim_words, ctx_words = cats[category], ctx_cats[category]
            if claim_words and ctx_words and not (claim_words & ctx_words):
                return {
                    "risk_score": 90.0,
                    "error_type": "numerical_mismatch",
                    "evidence": f"Context states {num} {'/'.join(sorted(ctx_words))}, not {'/'.join(sorted(claim_words))}.",
                }

    if unmatched_years:
        others = ", ".join(sorted(context_years)) or "no comparable dates"
        return {
            "risk_score": 82.0,
            "error_type": "temporal_mismatch",
            "evidence": f"Context references different dates: {others}.",
        }

    # ANY unmatched proper noun is suspicious -- not just "all of them
    # unmatched". A single swapped entity ("Samsung released..." when the
    # context says Apple) is the single most common entity hallucination,
    # and everything else in the sentence (dates, other nouns) typically
    # still matches; requiring every entity to be wrong missed exactly that
    # common case.
    if unmatched_entities:
        return {
            "risk_score": 65.0,
            "error_type": "entity_mismatch",
            "evidence": f"Named entities not found in context: {', '.join(sorted(unmatched_entities))}.",
        }

    # Localize to the single context sentence this claim is actually about --
    # comparing against the whole (often multi-sentence) context dilutes
    # overlap and lets an unrelated negation elsewhere misfire.
    relevant = _best_matching_sentence(claim, context)
    claim_stems = _content_stems(claim)
    relevant_stems = _content_stems(relevant)
    overlap = len(claim_stems & relevant_stems)
    coverage = overlap / max(1, len(claim_stems))

    # Polarity flip: the claim is clearly about the same statement as its
    # best-matching context sentence (high content-word overlap) but negates
    # it (or vice versa) -- e.g. claim says "not a great guy" / "will
    # guarantee", context says "a great guy" / "not guaranteed".
    if coverage >= 0.35 and bool(NEGATION_RE.search(claim)) != bool(NEGATION_RE.search(relevant)):
        return {
            "risk_score": 78.0,
            "error_type": "contradiction",
            "evidence": relevant,
        }

    if coverage < 0.25:
        return {"risk_score": 55.0, "error_type": "unverifiable", "evidence": None}

    return {"risk_score": round(max(5.0, 30.0 - coverage * 25), 1), "error_type": "none", "evidence": None}
