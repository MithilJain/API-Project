"""API key issuing + validation. Deliberately simple (JSON file, no hashing)
since this is a course demo, not a production auth system -- see backend/README.md."""

import secrets
from typing import Optional

from fastapi import Header, HTTPException, status

from .config import API_KEYS_FILE, REQUIRE_API_KEY
from .store import now_iso, read_json, write_json

DEFAULT_KEY_LABEL = "Frontend Demo Key"


def _load_keys() -> list[dict]:
    return read_json(API_KEYS_FILE, [])


def _save_keys(keys: list[dict]) -> None:
    write_json(API_KEYS_FILE, keys)


def list_keys() -> list[dict]:
    return _load_keys()


def create_key(label: str) -> dict:
    keys = _load_keys()
    record = {
        "id": secrets.token_hex(8),
        "key": "sk_live_" + secrets.token_hex(20),
        "label": label or "Untitled Key",
        "created_at": now_iso(),
        "last_used_at": None,
        "revoked": False,
    }
    keys.append(record)
    _save_keys(keys)
    return record


def roll_key(key_id: str) -> Optional[dict]:
    keys = _load_keys()
    for k in keys:
        if k["id"] == key_id:
            k["key"] = "sk_live_" + secrets.token_hex(20)
            k["revoked"] = False
            k["created_at"] = now_iso()
            k["last_used_at"] = None
            _save_keys(keys)
            return k
    return None


def revoke_key(key_id: str) -> Optional[dict]:
    keys = _load_keys()
    for k in keys:
        if k["id"] == key_id:
            k["revoked"] = True
            _save_keys(keys)
            return k
    return None


def _touch_last_used(key_value: str) -> None:
    keys = _load_keys()
    for k in keys:
        if k["key"] == key_value:
            k["last_used_at"] = now_iso()
            _save_keys(keys)
            return


def ensure_default_key() -> dict:
    """Returns the first active key, creating one if none exist yet.
    Called on server startup and from the /v1/api-keys/bootstrap endpoint
    the frontend hits on first load so the demo works with zero setup."""
    keys = _load_keys()
    active = [k for k in keys if not k["revoked"]]
    if active:
        return active[0]
    return create_key(DEFAULT_KEY_LABEL)


async def require_api_key(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not REQUIRE_API_KEY:
        return None
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Send 'Authorization: Bearer <key>'.",
        )
    token = authorization.split(" ", 1)[1].strip()
    for k in _load_keys():
        if k["key"] == token:
            if k["revoked"]:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key has been revoked.")
            _touch_last_used(token)
            return k
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key.")
