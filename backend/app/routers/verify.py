import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..schemas import VerifyRequest, VerifyResponse
from ..security import require_api_key
from ..services import settings_service
from ..services import history as history_service
from ..services.verifier import verify_answer

router = APIRouter(prefix="/v1", tags=["verify"])


@router.post("/verify", response_model=VerifyResponse)
async def verify(payload: VerifyRequest, api_key: dict | None = Depends(require_api_key)):
    settings = settings_service.get_settings()
    result_claims, engine = verify_answer(payload.context, payload.answer, settings)

    non_supported = sum(1 for c in result_claims if c.verdict.value != "Supported")
    hallucination_rate = round(100 * non_supported / len(result_claims), 1) if result_claims else 0.0

    model_name = payload.model or "Unspecified"
    history_service.record_verification("studio", model_name, payload.answer, result_claims, engine)

    return VerifyResponse(
        id=secrets.token_hex(8),
        model=model_name,
        created_at=datetime.now(timezone.utc),
        claims=result_claims,
        hallucination_rate=hallucination_rate,
        engine=engine,
    )
