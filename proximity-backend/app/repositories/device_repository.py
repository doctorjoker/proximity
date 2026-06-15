from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.device import Device, DeviceParameter


def _get_value(node: Any) -> Optional[Any]:
    """Extract GenieACS parameter value from {'_value': ...} nodes."""
    if isinstance(node, dict):
        return node.get("_value")
    return node


def _get_nested(data: dict, *path: str) -> Optional[Any]:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return _get_value(current)


def upsert_device_parameter(
    db: Session,
    device_id,
    name: str,
    value,
    parameter_type: str = "string",
) -> DeviceParameter:
    param = (
        db.query(DeviceParameter)
        .filter(
            DeviceParameter.device_id == device_id,
            DeviceParameter.parameter_name == name,
        )
        .first()
    )

    if not param:
        param = DeviceParameter(
            device_id=device_id,
            parameter_name=name,
        )
        db.add(param)

    param.parameter_value = None if value is None else str(value)
    param.parameter_type = parameter_type

    return param


def upsert_device_from_acs(db: Session, acs_device: dict) -> Device:
    acs_id = acs_device.get("_id")

    # GenieACS standard identity block, as saved in Mongo:
    # _deviceId: {_Manufacturer, _OUI, _ProductClass, _SerialNumber}
    device_id = acs_device.get("_deviceId", {}) or {}
    serial = device_id.get("_SerialNumber")
    oui = device_id.get("_OUI")
    manufacturer = device_id.get("_Manufacturer")
    product_class = device_id.get("_ProductClass")

    # Fallback for possible alternate payload shapes.
    legacy_device_id = acs_device.get("DeviceID", {}) or {}
    serial = serial or _get_value(legacy_device_id.get("SerialNumber"))
    oui = oui or _get_value(legacy_device_id.get("OUI"))
    manufacturer = manufacturer or _get_value(legacy_device_id.get("Manufacturer"))
    product_class = product_class or _get_value(legacy_device_id.get("ProductClass"))

    # TR-181 devices usually expose Device.DeviceInfo.*
    software_version = _get_nested(
        acs_device,
        "Device",
        "DeviceInfo",
        "SoftwareVersion",
    )
    hardware_version = _get_nested(
        acs_device,
        "Device",
        "DeviceInfo",
        "HardwareVersion",
    )

    # Fallback for TR-098 devices.
    software_version = software_version or _get_nested(
        acs_device,
        "InternetGatewayDevice",
        "DeviceInfo",
        "SoftwareVersion",
    )
    hardware_version = hardware_version or _get_nested(
        acs_device,
        "InternetGatewayDevice",
        "DeviceInfo",
        "HardwareVersion",
    )

    wan_ip = _get_nested(
        acs_device,
        "Device",
        "IP",
        "Interface",
        "3",
        "IPv4Address",
        "1",
        "IPAddress",
    )
    lan_ip = _get_nested(
        acs_device,
        "Device",
        "IP",
        "Interface",
        "1",
        "IPv4Address",
        "1",
        "IPAddress",
    )
    connection_request_url = _get_nested(
        acs_device,
        "Device",
        "ManagementServer",
        "ConnectionRequestURL",
    )
    root_data_model_version = _get_nested(
        acs_device,
        "Device",
        "RootDataModelVersion",
    )

    last_inform = acs_device.get("_lastInform")

    device = db.query(Device).filter(Device.acs_device_id == acs_id).first()

    if not device:
        device = Device(
            device_code=f"CPE-{serial or acs_id}",
            acs_device_id=acs_id,
            first_seen=datetime.now(timezone.utc),
        )
        db.add(device)

    device.serial_number = serial
    device.oui = oui
    device.manufacturer = manufacturer
    device.product_class = product_class
    device.model = product_class
    device.software_version = software_version
    device.hardware_version = hardware_version
    device.acs_last_inform = last_inform
    device.last_seen = last_inform
    device.online = True if last_inform else False
    device.status = "ONLINE" if last_inform else "UNKNOWN"
    device.raw_acs_payload = acs_device

    # Ensure a new device has an ID before inserting child parameters.
    db.flush()

    parameter_map = {
        "DeviceID.SerialNumber": serial,
        "DeviceID.OUI": oui,
        "DeviceID.Manufacturer": manufacturer,
        "DeviceID.ProductClass": product_class,
        "Device.DeviceInfo.SoftwareVersion": software_version,
        "Device.DeviceInfo.HardwareVersion": hardware_version,
        "Device.RootDataModelVersion": root_data_model_version,
        "Device.ManagementServer.ConnectionRequestURL": connection_request_url,
        "Device.IP.Interface.3.IPv4Address.1.IPAddress": wan_ip,
        "Device.IP.Interface.1.IPv4Address.1.IPAddress": lan_ip,
    }

    for name, value in parameter_map.items():
        upsert_device_parameter(
            db,
            device.id,
            name,
            value,
        )

    db.commit()
    db.refresh(device)

    return device
