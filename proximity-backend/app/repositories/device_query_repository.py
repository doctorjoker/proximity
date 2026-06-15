from sqlalchemy.orm import Session

from app.models.device import Device

from app.models.device import Device, DeviceParameter

def get_devices(db: Session):
    return (
        db.query(Device)
        .order_by(Device.created_at.desc())
        .all()
    )


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
