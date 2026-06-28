from pydantic import BaseModel


class RouterReplacementRequest(BaseModel):
    old_acs_device_id: str
    new_acs_device_id: str
