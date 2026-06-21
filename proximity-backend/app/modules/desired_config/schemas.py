from pydantic import BaseModel
from typing import Any


class DesiredConfigUpsert(BaseModel):
    source_system: str = "PROXIMITY"
    source_reference: str | None = None
    enabled: bool = True
    configuration: dict[str, Any]


class RestoreRequest(BaseModel):
    acs_device_id: str
