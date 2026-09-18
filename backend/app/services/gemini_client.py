"""Gemini-backed claim decomposer + classifier.

Same idea as the reference repo (LeNguyenAnhKhoa/Hallucination-Detection):
prompt an LLM with the answer + its source context and a fixed label set
(few-shot style task definition), and parse structured JSON back. Returns
None on any failure so the caller can fall back to the rule-based pipeline.

Decomposition and classification are done in a SINGLE call (verify_claims),
not one call per claim -- the free tier caps at 20 requests/day for this
model, and a naive one-call-per-claim design burns through that in a single
multi-claim answer. One call per verification keeps a whole demo session
inside the quota, and also means every claim in one answer is judged by the
same method (no partial gemini/rule-based mixing within a single answer)."""

import json
import logging
import time
from typing import Optional

from .. import config

logger = logging.getLogger("safe_rag.gemini")

_model = None
_configured = False

VALID_ERROR_TYPES = {
    "numerical_mismatch",
    "entity_mismatch",
    "temporal_mismatch",
    "formatting_mismatch",
    "contradiction",
    "unverifiable",
    "none",
}

VERIFY_PROMPT_TEMPLATE = """You are a rigorous fact-verification system for a Retrieval-Augmented Generation (RAG) pipeline.

You are given a SOURCE CONTEXT and an ANSWER an LLM produced from it. Do two things:

STEP 1 -- Decompose the ANSWER into atomic, independently-verifiable claims:
- Split every compound or multi-clause sentence into separate atomic claims, one fact per claim -- do NOT rely on periods alone; commas, "and", "but", semicolons often join multiple distinct claims too.
- Keep each claim self-contained: resolve pronouns ("he", "it", "they") to the noun they refer to, using the rest of the answer for context.
- Preserve specifics exactly (numbers, names, dates, percentages) -- do not paraphrase them away.
- Opinions and subjective statements ("X is a great person") ARE claims too -- include them as their own atomic claim, do not drop them.
- If the answer is already a single atomic statement, treat it as the only claim.
- Do not merge unrelated claims back together, and do not invent claims that aren't in the answer.

STEP 2 -- For EACH claim from step 1, judge it strictly against the SOURCE CONTEXT:
- risk_score: 0-100, how likely the claim is a hallucination NOT supported by the context. 0 = fully supported, 100 = clearly contradicted or fabricated.
- error_type: one of ["numerical_mismatch", "entity_mismatch", "temporal_mismatch", "formatting_mismatch", "contradiction", "unverifiable", "none"]
  - numerical_mismatch: the claim's numbers/quantities/percentages disagree with the context.
  - temporal_mismatch: the claim's dates/times disagree with the context.
  - entity_mismatch: the claim names a different person/place/organization than the context.
  - formatting_mismatch: the claim rephrases the context in a technically misleading way (units, rounding, scope).
  - contradiction: the claim directly negates, reverses, or opposes what the context says (flipped sentiment, negation, opposite characterization) -- use this general bucket when the mismatch isn't a number/date/entity/format issue.
  - unverifiable: the context has no information to confirm or deny the claim (e.g. a forecast/opinion the context never addresses).
  - none: the claim is well supported, no error.
- evidence: a short quote or paraphrase from the context that justifies the score, or null if the context says nothing relevant.

Respond with STRICT JSON only, matching this schema:
{{"claims": [{{"text": "<atomic claim text>", "risk_score": <0-100>, "error_type": "<one of the labels above>", "evidence": "<quote or null>"}}, ...]}}

SOURCE CONTEXT:
\"\"\"{context}\"\"\"

ANSWER:
\"\"\"{answer}\"\"\"

Respond with the JSON object only. No markdown fences, no commentary.
"""


def _get_model():
    global _model, _configured
    if not config.GEMINI_API_KEY:
        return None
    import google.generativeai as genai

    if not _configured:
        genai.configure(api_key=config.GEMINI_API_KEY)
        _configured = True
    if _model is None:
        _model = genai.GenerativeModel(config.GEMINI_MODEL)
    return _model


def verify_claims(answer: str, context: str) -> Optional[list[dict]]:
    """Decomposes `answer` into atomic claims AND classifies each against
    `context` in a single Gemini call. Returns a list of
    {text, risk_score, error_type, evidence} dicts, or None on any failure
    so the caller can fall back to the fully offline rule-based pipeline."""
    model = _get_model()
    if model is None:
        return None

    prompt = VERIFY_PROMPT_TEMPLATE.format(context=context[:6000], answer=answer[:4000])
    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.0,
                # Generous budget: gemini-3.6-flash spends a chunk of this on
                # internal "thinking" tokens before the visible JSON output,
                # and a multi-claim answer needs room for several objects.
                "max_output_tokens": 4096,
            },
            request_options={"timeout": config.GEMINI_TIMEOUT_SECONDS},
        )
        data = json.loads((response.text or "").strip())
        raw_claims = data.get("claims", [])
        if not isinstance(raw_claims, list) or not raw_claims:
            return None

        results = []
        for item in raw_claims:
            if not isinstance(item, dict):
                continue
            text = (item.get("text") or "").strip()
            if not text:
                continue
            risk_score = max(0.0, min(100.0, float(item.get("risk_score", 50))))
            error_type = item.get("error_type") or "none"
            if error_type not in VALID_ERROR_TYPES:
                error_type = "none"
            results.append(
                {
                    "text": text,
                    "risk_score": risk_score,
                    "error_type": error_type,
                    "evidence": item.get("evidence") or None,
                }
            )
        return results or None
    except Exception:
        logger.exception("Gemini verification failed for answer: %s", answer[:80])
        return None
    finally:
        if config.GEMINI_SLEEP_SECONDS:
            time.sleep(config.GEMINI_SLEEP_SECONDS)
