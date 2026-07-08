from typing import List, Optional

from pydantic import BaseModel, Field


class PhaseCreateRequest(BaseModel):
    phase_order: Optional[int] = None
    name: str
    action: str
    type: str = "Custom"
    timeout: str = "30s"
    retry: int = 0
    status: str = "DRAFT"
    description: Optional[str] = None
    continue_on_error: bool = False
    success_transition: Optional[str] = None
    error_transition: Optional[str] = None
    input_variables: Optional[str] = None
    output_variables: Optional[str] = None


class PhaseUpdateRequest(BaseModel):
    phase_order: Optional[int] = None
    name: Optional[str] = None
    action: Optional[str] = None
    type: Optional[str] = None
    timeout: Optional[str] = None
    retry: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    continue_on_error: Optional[bool] = None
    success_transition: Optional[str] = None
    error_transition: Optional[str] = None
    input_variables: Optional[str] = None
    output_variables: Optional[str] = None


class PhaseReorderItem(BaseModel):
    phase_id: int = Field(..., ge=1)
    phase_order: int = Field(..., ge=1)


class PhaseReorderRequest(BaseModel):
    items: List[PhaseReorderItem]
