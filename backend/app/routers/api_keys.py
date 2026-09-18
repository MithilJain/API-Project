"""Key management endpoints. Intentionally NOT behind `require_api_key` --
this is the surface used to issue/inspect/revoke keys in the first place
(mirrors how e.g. Stripe's dashboard uses session auth, not API-key auth,
to manage API keys). In production this would sit behind user/session auth."""

from fastapi import APIRouter, HTTPException

from .. import security
from ..schemas import ApiKeyCreated, ApiKeyCreateRequest, ApiKeyPublic

router = APIRouter(prefix="/v1/api-keys", tags=["api-keys"])


def _to_public(record: dict) -> ApiKeyPublic:
    key = record["key"]
    preview = f"{key[:11]}...{key[-4:]}" if len(key) > 15 else key
    return ApiKeyPublic(
        id=record["id"],
        label=record["label"],
        created_at=record["created_at"],
        last_used_at=record.get("last_used_at"),
        revoked=record["revoked"],
        key_preview=preview,
    )


@router.get("", response_model=list[ApiKeyPublic])
async def list_api_keys():
    return [_to_public(k) for k in security.list_keys()]


@router.post("", response_model=ApiKeyCreated)
async def create_api_key(payload: ApiKeyCreateRequest):
    record = security.create_key(payload.label)
    return ApiKeyCreated(**_to_public(record).model_dump(), key=record["key"])


@router.post("/bootstrap", response_model=ApiKeyCreated)
async def bootstrap_key():
    """Returns (creating if needed) the first active key. The frontend calls
    this once on first load so the demo works with zero manual setup."""
    record = security.ensure_default_key()
    return ApiKeyCreated(**_to_public(record).model_dump(), key=record["key"])


@router.post("/{key_id}/roll", response_model=ApiKeyCreated)
async def roll_api_key(key_id: str):
    record = security.roll_key(key_id)
    if not record:
        raise HTTPException(status_code=404, detail="API key not found")
    return ApiKeyCreated(**_to_public(record).model_dump(), key=record["key"])


@router.post("/{key_id}/revoke", response_model=ApiKeyPublic)
async def revoke_api_key(key_id: str):
    record = security.revoke_key(key_id)
    if not record:
        raise HTTPException(status_code=404, detail="API key not found")
    return _to_public(record)
