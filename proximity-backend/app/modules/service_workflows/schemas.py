from typing import Any

from pydantic import BaseModel, Field


class WorkflowStartRequest(BaseModel):
    workflow_type: str
    service_code: str
    acs_device_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)

class WorkflowDefinitionCreateRequest(BaseModel):
    definition_code: str
    name: str
    description: str | None = None


class WorkflowDefinitionVersionCreateRequest(BaseModel):
    version: int
    definition_json: dict[str, Any]


class WorkflowDefinitionPublishRequest(BaseModel):
    version: int
