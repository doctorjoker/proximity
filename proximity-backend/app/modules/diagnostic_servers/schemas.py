from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

ServerType = Literal["TR143_HTTP", "WEB_SPEEDTEST", "OOKLA", "CUSTOM"]

class DiagnosticFileCreate(BaseModel):
    label: str
    relative_path: str
    expected_size_bytes: int = Field(gt=0)
    enabled: bool = True
    sort_order: int = 0

class DiagnosticServerCreate(BaseModel):
    code: str
    name: str
    server_type: ServerType = "TR143_HTTP"
    base_url: str
    download_path: str = "/download"
    upload_url: str | None = None
    is_default: bool = False
    enabled: bool = True
    notes: str | None = None
    files: list[DiagnosticFileCreate] = []

class DiagnosticServerUpdate(BaseModel):
    name: str | None = None
    server_type: ServerType | None = None
    base_url: str | None = None
    download_path: str | None = None
    upload_url: str | None = None
    is_default: bool | None = None
    enabled: bool | None = None
    notes: str | None = None

class DiagnosticValidationRequest(BaseModel):
    file_id: int | None = None
    timeout_seconds: int = Field(default=10, ge=1, le=60)
