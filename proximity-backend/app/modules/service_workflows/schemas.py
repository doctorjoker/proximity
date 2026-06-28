from pydantic import BaseModel


class WorkflowStartRequest(BaseModel):
    workflow_type: str
    service_code: str
    acs_device_id: str
