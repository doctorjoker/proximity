from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class QualificationRunCreate(BaseModel):
    device_id: UUID
    server_ids: list[int] = Field(default_factory=list)
    file_ids: list[int] = Field(default_factory=list)
    include_ping: bool = True
    ping_target: str = "8.8.8.8"
    repetitions: int = Field(default=3, ge=1, le=10)
    requested_by: str | None = Field(default=None, max_length=160)


class QualificationRunStart(BaseModel):
    force: bool = False


class QualificationRunResponse(BaseModel):
    success: bool = True
    run: dict[str, Any]


class QualificationRunControl(BaseModel):
    force: bool = False
    reason: str | None = Field(default=None, max_length=500)
