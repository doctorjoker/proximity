from typing import Optional
from pydantic import BaseModel


class ProcedureValidateRequest(BaseModel):
    requested_by: Optional[str] = "Admin Proximity"


class ProcedurePublishRequest(BaseModel):
    requested_by: Optional[str] = "Admin Proximity"
    force: bool = False


class ProcedureCloneRequest(BaseModel):
    requested_by: Optional[str] = "Admin Proximity"
    target_version: Optional[str] = None
    notes: Optional[str] = None
