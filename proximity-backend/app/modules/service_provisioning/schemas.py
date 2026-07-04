"""
EUREKA 8.0.1

Provisioning Context Models
"""

from pydantic import BaseModel


class PPPContext(BaseModel):
    username: str | None = None
    password: str | None = None


class WiFiContext(BaseModel):
    ssid: str | None = None
    password: str | None = None


class VoIPContext(BaseModel):
    username: str | None = None
    password: str | None = None


class ServiceContext(BaseModel):
    service_code: str
    customer_id: str | None = None
    customer_name: str | None = None
    plan_name: str | None = None
    vlan_id: int | None = None


class DeviceContext(BaseModel):
    acs_device_id: str | None = None
    serial_number: str | None = None
    vendor: str | None = None
    model: str | None = None


class ProvisioningContext(BaseModel):
    service: ServiceContext
    device: DeviceContext
    ppp: PPPContext
    wifi: WiFiContext
    voip: VoIPContext
