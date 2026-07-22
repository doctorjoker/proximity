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
