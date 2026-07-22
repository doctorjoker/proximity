from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProcedureCreate(BaseModel):
    code: str
    name: str
    category: str = "Provisioning"
    trigger_type: str = "Manuale / WFM"
    owner: str = "Proximity Operations"
    status: str = "DRAFT"
    description: Optional[str] = None


class ProcedureTestRequest(BaseModel):
    input: Dict[str, Any]
    requested_by: str = "Admin Proximity"


class DesignerNodePosition(BaseModel):
    x: float = 120
    y: float = 120


class DesignerNode(BaseModel):
    id: str
    position: DesignerNodePosition


class DesignerEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    transition_type: str = "SUCCESS"
    label: Optional[str] = None
    sort_order: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProcedureDesignerSaveRequest(BaseModel):
    nodes: List[DesignerNode] = Field(default_factory=list)
    edges: List[DesignerEdge] = Field(default_factory=list)


class ProcedurePhaseCreateRequest(BaseModel):
    name: str
    action: str = "noop"
    type: str = "Action"
    timeout: str = "30s"
    retry: int = Field(default=0, ge=0)
    status: str = "DRAFT"
    description: Optional[str] = None
    continue_on_error: bool = False
    success_transition: Optional[str] = None
    error_transition: Optional[str] = None
    input_variables: Optional[str] = None
    output_variables: Optional[str] = None
    phase_order: Optional[int] = Field(default=None, ge=1)
    position: DesignerNodePosition = Field(default_factory=DesignerNodePosition)


class ProcedurePhaseUpdateRequest(BaseModel):
    name: Optional[str] = None
    action: Optional[str] = None
    type: Optional[str] = None
    timeout: Optional[str] = None
    retry: Optional[int] = Field(default=None, ge=0)
    status: Optional[str] = None
    description: Optional[str] = None
    continue_on_error: Optional[bool] = None
    success_transition: Optional[str] = None
    error_transition: Optional[str] = None
    input_variables: Optional[str] = None
    output_variables: Optional[str] = None
    phase_order: Optional[int] = Field(default=None, ge=1)
    position: Optional[DesignerNodePosition] = None


class ProcedurePhaseResponse(BaseModel):
    id: str
    position: DesignerNodePosition
    data: Dict[str, Any]
