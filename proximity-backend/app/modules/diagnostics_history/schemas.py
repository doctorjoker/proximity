from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DiagnosticEventOut(BaseModel):
    event_key: str | None = None
    event_type: str = "info"
    phase: str | None = None
    title: str
    detail: str | None = None
    occurred_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiagnosticExecutionOut(BaseModel):
    execution_id: str
    acs_device_id: str
    diagnostic_type: str
    state: str
    phase: str | None = None
    progress: int = 0
    requested_url: str | None = None
    target_host: str | None = None
    throughput_mbps: float | None = None
    duration_ms: int | None = None
    tcp_open_ms: int | None = None
    test_bytes_received: int | None = None
    total_bytes_received: int | None = None
    packets_sent: int | None = None
    packets_received: int | None = None
    packet_loss_percent: float | None = None
    min_response_ms: int | None = None
    avg_response_ms: int | None = None
    max_response_ms: int | None = None
    raw_state: str | None = None
    result_payload: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime
    completed_at: datetime | None = None
    events: list[DiagnosticEventOut] = Field(default_factory=list)


class DiagnosticHistoryResponse(BaseModel):
    count: int
    items: list[DiagnosticExecutionOut]
