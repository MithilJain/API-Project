import secrets

from ..schemas import Claim, Verdict
from . import claims as claims_service
from . import gemini_client, rules


def _verdict_from_score(risk_score: float, settings: dict) -> Verdict:
    lower = settings.get("lower_bound", 40)
    upper = settings.get("upper_bound", 60)
    if risk_score < lower:
        return Verdict.supported
    if risk_score > upper:
        return Verdict.contradicted
    return Verdict.abstain


def verify_answer(context: str, answer: str, settings: dict) -> tuple[list[Claim], str]:
    """Decomposes `answer` into claims and classifies each against `context`.

    Tries a single combined Gemini call (decompose + classify every claim at
    once) first; falls back to the deterministic rule-based pipeline
    (regex sentence-split + lexical-overlap scoring) as a whole on any
    failure, so a verification is never a mix of gemini-judged and
    rule-judged claims. The verdict (Supported/Contradicted/Abstain) is
    derived from the risk score using the current threshold settings, so
    tuning the Settings page sliders directly changes classification
    behavior.
    """
    gemini_results = gemini_client.verify_claims(answer, context)

    result_claims: list[Claim] = []

    if gemini_results is not None:
        for item in gemini_results:
            result_claims.append(
                Claim(
                    id=secrets.token_hex(6),
                    text=item["text"],
                    verdict=_verdict_from_score(item["risk_score"], settings),
                    risk_score=round(item["risk_score"], 1),
                    evidence=item.get("evidence"),
                    error_type=item.get("error_type") or "none",
                )
            )
        return result_claims, "gemini"

    claim_texts = claims_service.split_into_claims(answer)
    for text in claim_texts:
        scored = rules.rule_based_score(text, context)
        result_claims.append(
            Claim(
                id=secrets.token_hex(6),
                text=text,
                verdict=_verdict_from_score(scored["risk_score"], settings),
                risk_score=round(scored["risk_score"], 1),
                evidence=scored.get("evidence"),
                error_type=scored.get("error_type") or "none",
            )
        )
    return result_claims, "rule_based_fallback"
