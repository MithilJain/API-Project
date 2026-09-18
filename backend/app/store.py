"""Tiny JSON-file-backed storage. No database needed for a course demo:
each collection (api keys, settings, verification history) is just a JSON
file under backend/data/, guarded by a lock since uvicorn's dev server is
single-process."""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_lock = threading.Lock()


def _read(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def _write(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def read_json(path: Path, default: Any) -> Any:
    with _lock:
        return _read(path, default)


def write_json(path: Path, data: Any) -> None:
    with _lock:
        _write(path, data)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
