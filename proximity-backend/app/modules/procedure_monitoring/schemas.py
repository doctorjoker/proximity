from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExecutionPhaseItem(BaseModel):
    id: int
    execution_id: int
    phase_key: str
    phase_name: str
    phase_order: int
    handler_name: Optional[str] = None
    status: str
    started_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    duration_ms: Optional[int] = None
    input_json: Dict[str, Any] = Field(default_factory=dict)
    output_json: Dict[str, Any] = Field(default_factory=dict)
    error_json: Dict[str, Any] = Field(default_factory=dict)


class ExecutionPhasesResponse(BaseModel):
    success: bool = True
    execution: Dict[str, Any]
    items: List[ExecutionPhaseItem]
