from pydantic import BaseModel


class CustomerServiceRestoreRequest(BaseModel):
    acs_device_id: str
