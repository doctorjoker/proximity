from sqlalchemy.orm import Session

from app.models.device import Device

from app.models.device import Device, DeviceAcsIdentity, DeviceParameter
from app.services.device_presence import (
    classify_inventory_kind,
    classify_presence,
    is_customer_visible,
)

def get_devices(db: Session, include_technical: bool = False):
    devices = (
        db.query(Device)
        .order_by(Device.created_at.desc())
        .all()
    )

    visible = []
    for device in devices:
        presence = classify_presence(device.last_seen)
        device.online = presence.online
        device.status = presence.state
        device.presence_age_seconds = presence.age_seconds
        device.inventory_kind = classify_inventory_kind(
            device.manufacturer,
            device.product_class,
            device.model,
            device.acs_device_id,
        )
        device.acs_identity_count = (
            db.query(DeviceAcsIdentity)
            .filter(
                DeviceAcsIdentity.device_id == device.id,
                DeviceAcsIdentity.active.is_(True),
            )
            .count()
        )
        device.has_multiple_acs_identities = device.acs_identity_count > 1
        if include_technical or is_customer_visible(device.inventory_kind):
            visible.append(device)

    return visible


def get_device(db: Session, device_id: str):
    return (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )


def get_device_parameters(db: Session, device_id: str):
    return (
        db.query(DeviceParameter)
        .filter(DeviceParameter.device_id == device_id)
        .order_by(DeviceParameter.parameter_name.asc())
        .all()
    )


def get_device_parameters_map(db: Session, device_id: str):
    params = get_device_parameters(db, device_id)

    return {
        p.parameter_name: p.parameter_value
        for p in params
    }
