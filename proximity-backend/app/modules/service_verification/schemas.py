from pydantic import BaseModel


class ServiceVerificationRequest(BaseModel):
    acs_device_id: str
