from pydantic import BaseModel


class DeviceAuthorizationRequest(BaseModel):
    acs_device_id: str
