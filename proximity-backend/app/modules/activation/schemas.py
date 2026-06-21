from pydantic import BaseModel


class ActivationRequest(BaseModel):
    service_order_code: str
    customer_id: str
    customer_name: str

    service_type: str = "INTERNET"
    access_type: str = "FTTH"

    plan_name: str | None = None

    pppoe_username: str | None = None
    pppoe_password: str | None = None

    vlan: int | None = None

    ont_serial: str | None = None
    acs_device_id: str | None = None

    requested_by: str = "NOVASPACE"
