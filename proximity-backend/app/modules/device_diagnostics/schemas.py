from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class DiagnosticJobCreate(BaseModel):
    device_id: UUID
    diagnostic_type: str = Field(min_length=2, max_length=80)
    parameters: dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: int = Field(default=120, ge=5, le=3600)
    requested_by: str | None = Field(default=None, max_length=160)

    @field_validator("diagnostic_type")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        return value.strip().upper().replace("-", "_").replace(" ", "_")


class DiagnosticJobCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class DiagnosticJobResponse(BaseModel):
    success: bool = True
    job: dict[str, Any]
