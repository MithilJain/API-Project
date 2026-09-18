from collections import Counter, defaultdict

from fastapi import APIRouter, Depends

from ..schemas import AnalyticsSummary, ModelStat, TimeseriesPoint
from ..security import require_api_key
from ..services import history as history_service

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(api_key: dict | None = Depends(require_api_key)):
    records = history_service.all_records()
    total_claims = 0
    non_supported = 0
    error_counter: Counter = Counter()
    engine_counter: Counter = Counter()

    for r in records:
        engine_counter[r.get("engine", "unknown")] += 1
        for c in r["claims"]:
            total_claims += 1
            if c["verdict"] != "Supported":
                non_supported += 1
            if c["error_type"] and c["error_type"] != "none":
                error_counter[c["error_type"]] += 1

    rate = round(100 * non_supported / total_claims, 1) if total_claims else 0.0

    return AnalyticsSummary(
        total_verifications=len(records),
        total_claims=total_claims,
        hallucination_rate=rate,
        error_type_breakdown=dict(error_counter),
        engine_breakdown=dict(engine_counter),
        recent=list(reversed(records))[:10],
    )


@router.get("/timeseries", response_model=list[TimeseriesPoint])
async def timeseries(api_key: dict | None = Depends(require_api_key)):
    records = history_service.all_records()
    buckets: dict[str, list[int]] = defaultdict(lambda: [0, 0])  # [non_supported, total]

    for r in records:
        day = r["created_at"][:10]
        for c in r["claims"]:
            buckets[day][1] += 1
            if c["verdict"] != "Supported":
                buckets[day][0] += 1

    points = []
    for day in sorted(buckets.keys()):
        non_supported, total = buckets[day]
        rate = round(100 * non_supported / total, 1) if total else 0.0
        points.append(TimeseriesPoint(date=day, rate=rate))
    return points


@router.get("/models", response_model=list[ModelStat])
async def model_stats(api_key: dict | None = Depends(require_api_key)):
    records = history_service.all_records()
    per_model: dict[str, Counter] = defaultdict(Counter)

    for r in records:
        for c in r["claims"]:
            per_model[r["model"]][c["verdict"]] += 1

    stats = []
    for model, counts in per_model.items():
        total = sum(counts.values())
        if not total:
            continue
        stats.append(
            ModelStat(
                model=model,
                total=total,
                supported_rate=round(100 * counts.get("Supported", 0) / total, 1),
                contradicted_rate=round(100 * counts.get("Contradicted", 0) / total, 1),
                abstain_rate=round(100 * counts.get("Abstain", 0) / total, 1),
            )
        )
    return stats
