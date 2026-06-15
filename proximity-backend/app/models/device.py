import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    device_code = Column(String(64), unique=True, nullable=False)
    acs_device_id = Column(Text, unique=True, nullable=False)

    serial_number = Column(String(128), index=True)
    oui = Column(String(32), index=True)
    manufacturer = Column(String(128))
    model = Column(String(128))
    product_class = Column(String(128))

    software_version = Column(String(128))
    hardware_version = Column(String(128))

    status = Column(String(32), default="UNKNOWN")
    online = Column(Boolean, default=False)

    first_seen = Column(DateTime(timezone=True))
    last_seen = Column(DateTime(timezone=True))
    acs_last_inform = Column(DateTime(timezone=True))

    tenant_id = Column(String(64), index=True, default="default")
    customer_code = Column(String(128), index=True)

    raw_acs_payload = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer_code = Column(String(64), index=True)
    customer_name = Column(String(255))

    service_code = Column(String(64), index=True)
    service_order_code = Column(String(64), index=True)

    site_address = Column(String(255))

    tenant_id = Column(String(64), index=True)


class DeviceParameter(Base):
    __tablename__ = "device_parameters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    parameter_name = Column(Text, nullable=False, index=True)
    parameter_value = Column(Text)
    parameter_type = Column(String(64))

    last_refresh = Column(DateTime(timezone=True), server_default=func.now())


class DeviceEvent(Base):
    __tablename__ = "device_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), index=True)

    event_type = Column(String(64), index=True)
    severity = Column(String(32), default="INFO")
    message = Column(Text)
    payload = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
