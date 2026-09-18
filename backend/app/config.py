import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))
GEMINI_SLEEP_SECONDS = float(os.getenv("GEMINI_SLEEP_SECONDS", "0.5"))

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

REQUIRE_API_KEY = os.getenv("REQUIRE_API_KEY", "true").lower() != "false"

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

API_KEYS_FILE = DATA_DIR / "api_keys.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
HISTORY_FILE = DATA_DIR / "history.json"

HISTORY_MAX_ITEMS = int(os.getenv("HISTORY_MAX_ITEMS", "500"))
