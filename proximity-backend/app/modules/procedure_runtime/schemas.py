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
