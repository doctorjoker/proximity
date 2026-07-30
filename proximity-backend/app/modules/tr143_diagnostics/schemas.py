from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class DownloadStartRequest(BaseModel):
    file_name: str | None = Field(default=None, examples=["100MB.bin"])
    download_url: HttpUrl | None = None
    timeout_seconds: int | None = Field(default=None, ge=30, le=1800)


class DiagnosticEvent(BaseModel):
    timestamp: datetime
    code: str
    label: str
    status: Literal["PENDING", "RUNNING", "SUCCESS", "WARNING", "ERROR"]
    detail: str | None = None


class ServerEvidence(BaseModel):
    observed: bool = False
    source_ip: str | None = None
    request_target: str | None = None
    http_status: int | None = None
    bytes_sent: int | None = None
    observed_at: datetime | None = None
    execution_id: UUID | None = None
    log_path: str | None = None


class DownloadResult(BaseModel):
    diagnostics_state: str | None = None
    throughput_mbps: float | None = None
    download_bytes: int | None = None
    total_bytes_received: int | None = None
    duration_ms: float | None = None
    tcp_open_ms: float | None = None
    rom_time: datetime | None = None
    bom_time: datetime | None = None
    eom_time: datetime | None = None
    tcp_open_request_time: datetime | None = None
    tcp_open_response_time: datetime | None = None
    result_source: Literal["CPE", "SERVER_EVIDENCE", "CPE_AND_SERVER"] = "CPE"
    server_evidence: ServerEvidence | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class ValidationCheck(BaseModel):
    code: str
    label: str
    status: Literal["PASS", "WARNING", "FAIL", "NOT_AVAILABLE"]
    score_delta: int = 0
    detail: str | None = None


class ValidationResult(BaseModel):
    status: Literal["VALID", "WARNING", "INVALID"]
    score: int = Field(ge=0, le=100)
    checks: list[ValidationCheck] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class DownloadExecution(BaseModel):
    execution_id: UUID
    device_id: str
    status: Literal[
        "QUEUED",
        "PREPARING",
        "REQUESTED",
        "RUNNING",
        "WAITING_FOR_RESULT",
        "COMPLETED",
        "COMPLETED_WITH_WARNINGS",
        "COMPLETED_WITH_SERVER_EVIDENCE",
        "FAILED_VALIDATION",
        "FAILED",
        "TIMED_OUT",
    ]
    progress: int = Field(ge=0, le=100)
    download_url: str
    file_name: str
    started_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    result: DownloadResult | None = None
    validation: ValidationResult | None = None
    events: list[DiagnosticEvent] = Field(default_factory=list)


class DownloadCapability(BaseModel):
    supported: bool
    object_path: str
    download_transports: str | None = None
    diagnostics_state: str | None = None
    available_parameters: list[str] = Field(default_factory=list)
