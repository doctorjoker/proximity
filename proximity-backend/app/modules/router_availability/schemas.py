from pydantic import BaseModel


class RouterAvailabilityRequest(BaseModel):
    acs_device_id: str
