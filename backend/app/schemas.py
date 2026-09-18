from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class Verdict(str, Enum):
    supported = "Supported"
    contradicted = "Contradicted"
    abstain = "Abstain"


class ErrorType(str, Enum):
    numerical_mismatch = "numerical_mismatch"
    entity_mismatch = "entity_mismatch"
    temporal_mismatch = "temporal_mismatch"
    formatting_mismatch = "formatting_mismatch"
    contradiction = "contradiction"
    unverifiable = "unverifiable"
    none = "none"


class Claim(BaseModel):
    id: str
    text: str
    verdict: Verdict
    risk_score: float = Field(..., ge=0, le=100)
    evidence: Optional[str] = None
    error_type: Optional[ErrorType] = ErrorType.none


# ---- /v1/verify ----


class VerifyRequest(BaseModel):
    context: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    model: Optional[str] = Field(
        default=None,
        description="Name of the LLM that produced the answer, used for analytics grouping.",
    )


class VerifyResponse(BaseModel):
    id: str
    model: str
    created_at: datetime
    claims: List[Claim]
    hallucination_rate: float
    engine: str  # "gemini" | "rule_based_fallback" | "mixed"


# ---- /v1/settings ----


class ThresholdSettings(BaseModel):
    lower_bound: int = Field(default=40, ge=0, le=100)
    upper_bound: int = Field(default=60, ge=0, le=100)

    @model_validator(mode="after")
    def check_bounds(self) -> "ThresholdSettings":
        if self.lower_bound > self.upper_bound:
            raise ValueError("lower_bound must be <= upper_bound")
        return self


# ---- /v1/api-keys ----


class ApiKeyPublic(BaseModel):
    id: str
    label: str
    created_at: str
    last_used_at: Optional[str] = None
    revoked: bool
    key_preview: str


class ApiKeyCreated(ApiKeyPublic):
    key: str


class ApiKeyCreateRequest(BaseModel):
    label: str = "Untitled Key"


# ---- /v1/analytics ----


class AnalyticsSummary(BaseModel):
    total_verifications: int
    total_claims: int
    hallucination_rate: float
    error_type_breakdown: Dict[str, int]
    engine_breakdown: Dict[str, int]
    recent: List[Dict[str, Any]]


class TimeseriesPoint(BaseModel):
    date: str
    rate: float


class ModelStat(BaseModel):
    model: str
    total: int
    supported_rate: float
    contradicted_rate: float
    abstain_rate: float
