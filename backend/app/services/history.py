"""Append-only log of verification runs, backing the Analytics/Dashboard pages
with real (not mocked) data collected during the demo session."""

from .. import config
from ..schemas import Claim
from ..store import now_iso, read_json, write_json


def _load() -> list[dict]:
    return read_json(config.HISTORY_FILE, [])


def _save(items: list[dict]) -> None:
    write_json(config.HISTORY_FILE, items)


def record_verification(source: str, model: str, snippet: str, claims: list[Claim], engine: str) -> None:
    items = _load()
    items.append(
        {
            "created_at": now_iso(),
            "source": source,  # "studio"
            "model": model or "Unspecified",
            "snippet": snippet[:140],
            "engine": engine,
            "claims": [
                {
                    "text": c.text,
                    "verdict": c.verdict.value,
                    "risk_score": c.risk_score,
                    "error_type": c.error_type.value if c.error_type else "none",
                }
                for c in claims
            ],
        }
    )
    _save(items[-config.HISTORY_MAX_ITEMS :])


def all_records() -> list[dict]:
    return _load()
