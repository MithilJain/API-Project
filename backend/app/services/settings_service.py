from .. import config
from ..schemas import ThresholdSettings
from ..store import read_json, write_json

DEFAULTS = {"lower_bound": 40, "upper_bound": 60}


def get_settings() -> dict:
    data = read_json(config.SETTINGS_FILE, DEFAULTS)
    return {**DEFAULTS, **data}


def save_settings(settings: ThresholdSettings) -> dict:
    data = settings.model_dump()
    write_json(config.SETTINGS_FILE, data)
    return data
