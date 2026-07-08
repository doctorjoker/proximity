from typing import Any, Dict, Optional
from pydantic import BaseModel


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
