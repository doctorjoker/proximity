from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ProcedureExecuteRequest(BaseModel):
    requested_by: str = Field(default="Admin Proximity")
    context: Dict[str, Any] = Field(default_factory=dict)
    mode: str = Field(default="TEST")


class ProcedureExecutionResponse(BaseModel):
    success: bool
    execution: Dict[str, Any]
    scheduler: Optional[Dict[str, Any]] = None


class ProcedureExecutionPhaseResponse(BaseModel):
    id: int
    execution_id: int
    phase_key: str
    phase_name: str
    phase_order: Optional[int] = None
    handler_name: str
    status: str
    duration_ms: Optional[int] = None
    input_json: Dict[str, Any] = Field(default_factory=dict)
    output_json: Dict[str, Any] = Field(default_factory=dict)
    error_json: Dict[str, Any] = Field(default_factory=dict)
    attempt: int = 1
    max_attempts: int = 1
    retry_policy: Dict[str, Any] = Field(default_factory=dict)
    retry_delay_ms: Optional[int] = None
    retry_reason: Optional[str] = None
    next_retry_at: Optional[str] = None
    attempts_json: list[Dict[str, Any]] = Field(default_factory=list)
