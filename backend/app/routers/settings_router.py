from fastapi import APIRouter, Depends

from ..schemas import ThresholdSettings
from ..security import require_api_key
from ..services import settings_service

router = APIRouter(prefix="/v1/settings", tags=["settings"])


@router.get("", response_model=ThresholdSettings)
async def get_settings(api_key: dict | None = Depends(require_api_key)):
    return settings_service.get_settings()


@router.put("", response_model=ThresholdSettings)
async def update_settings(payload: ThresholdSettings, api_key: dict | None = Depends(require_api_key)):
    return settings_service.save_settings(payload)
