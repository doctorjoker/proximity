from typing import Any

from pydantic import BaseModel, Field


class WorkflowStartRequest(BaseModel):
    workflow_type: str
    service_code: str
    acs_device_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
