from pydantic import BaseModel
from typing import Optional


class CustomerServiceCreate(BaseModel):
    service_code: str
    customer_id: str
    customer_name: Optional[str] = None
    service_type: str = "INTERNET"
    access_type: str = "FTTH"
    plan_name: Optional[str] = None
    status: str = "PENDING"
    pppoe_username: Optional[str] = None
    pppoe_password: Optional[str] = None
    vlan: Optional[int] = None
    source_system: str = "WFM"
    source_order_code: Optional[str] = None


class ProvisionRequest(BaseModel):
    requested_by: str = "BACKOFFICE"


class DeviceBindingCreate(BaseModel):
    acs_device_id: str
    serial_number: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    binding_status: str = "BOUND"
