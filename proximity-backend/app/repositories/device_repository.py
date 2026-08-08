from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.device import Device, DeviceAcsIdentity, DeviceParameter
from app.services.device_identity import resolve_model
from app.services.device_presence import classify_presence


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


def _as_utc_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            return None
    return None


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
        param = DeviceParameter(device_id=device_id, parameter_name=name)
        db.add(param)

    param.parameter_value = None if value is None else str(value)
    param.parameter_type = parameter_type
    return param


def _upsert_acs_identity(
    db: Session,
    *,
    device: Device,
    acs_id: str,
    serial: Optional[str],
    oui: Optional[str],
    manufacturer: Optional[str],
    product_class: Optional[str],
    software_version: Optional[str],
    hardware_version: Optional[str],
    last_inform: Optional[datetime],
    raw_payload: dict,
) -> DeviceAcsIdentity:
    identity = (
        db.query(DeviceAcsIdentity)
        .filter(DeviceAcsIdentity.acs_device_id == acs_id)
        .first()
    )

    if not identity:
        identity = DeviceAcsIdentity(
            device_id=device.id,
            acs_device_id=acs_id,
            first_seen=last_inform or datetime.now(timezone.utc),
        )
        db.add(identity)
    elif identity.device_id != device.id:
        # Serial/device-code matching is authoritative for the physical CPE.
        identity.device_id = device.id

    identity.serial_number = serial
    identity.oui = oui
    identity.manufacturer = manufacturer
    identity.product_class = product_class
    identity.software_version = software_version
    identity.hardware_version = hardware_version
    identity.last_seen = last_inform
    identity.active = True
    identity.raw_acs_payload = raw_payload
    return identity


def _select_preferred_identity(db: Session, device: Device) -> Optional[DeviceAcsIdentity]:
    """Choose one stable execution identity without list-order ping-pong.

    Most recent last_seen wins. On equal/unknown timestamps, the current
    preferred identity remains selected; otherwise acs_device_id provides a
    deterministic tie-breaker.
    """
    identities = (
        db.query(DeviceAcsIdentity)
        .filter(
            DeviceAcsIdentity.device_id == device.id,
            DeviceAcsIdentity.active.is_(True),
        )
        .all()
    )
    if not identities:
        return None

    current = next(
        (item for item in identities if item.acs_device_id == device.acs_device_id),
        None,
    )

    newest_seen = max(
        (item.last_seen for item in identities if item.last_seen is not None),
        default=None,
    )
    if current and (newest_seen is None or current.last_seen == newest_seen):
        return current

    candidates = [item for item in identities if item.last_seen == newest_seen]
    if not candidates:
        candidates = identities
    return sorted(candidates, key=lambda item: item.acs_device_id)[0]


def upsert_device_from_acs(db: Session, acs_device: dict) -> Device:
    acs_id = acs_device.get("_id")
    if not acs_id:
        raise ValueError("GenieACS payload has no _id")

    device_id = acs_device.get("_deviceId", {}) or {}
    serial = device_id.get("_SerialNumber")
    oui = device_id.get("_OUI")
    manufacturer = device_id.get("_Manufacturer")
    product_class = device_id.get("_ProductClass")

    legacy_device_id = acs_device.get("DeviceID", {}) or {}
    serial = serial or _get_value(legacy_device_id.get("SerialNumber"))
    oui = oui or _get_value(legacy_device_id.get("OUI"))
    manufacturer = manufacturer or _get_value(legacy_device_id.get("Manufacturer"))
    product_class = product_class or _get_value(legacy_device_id.get("ProductClass"))

    software_version = _get_nested(acs_device, "Device", "DeviceInfo", "SoftwareVersion")
    hardware_version = _get_nested(acs_device, "Device", "DeviceInfo", "HardwareVersion")
    software_version = software_version or _get_nested(
        acs_device, "InternetGatewayDevice", "DeviceInfo", "SoftwareVersion"
    )
    hardware_version = hardware_version or _get_nested(
        acs_device, "InternetGatewayDevice", "DeviceInfo", "HardwareVersion"
    )

    wan_ip = _get_nested(
        acs_device, "Device", "IP", "Interface", "3", "IPv4Address", "1", "IPAddress"
    )
    lan_ip = _get_nested(
        acs_device, "Device", "IP", "Interface", "1", "IPv4Address", "1", "IPAddress"
    )
    connection_request_url = _get_nested(
        acs_device, "Device", "ManagementServer", "ConnectionRequestURL"
    )
    root_data_model_version = _get_nested(acs_device, "Device", "RootDataModelVersion")
    last_inform = _as_utc_datetime(acs_device.get("_lastInform"))
    resolved_model = resolve_model(acs_device, product_class)

    # An already-recorded ACS identity is the strongest direct match.
    identity = (
        db.query(DeviceAcsIdentity)
        .filter(DeviceAcsIdentity.acs_device_id == acs_id)
        .first()
    )
    device = db.query(Device).filter(Device.id == identity.device_id).first() if identity else None

    # Compatibility match for installations before this foundation.
    if not device:
        device = db.query(Device).filter(Device.acs_device_id == acs_id).first()

    # Stable physical identity.
    if not device and serial:
        device = db.query(Device).filter(Device.serial_number == serial).first()

    device_code = f"CPE-{serial or acs_id}"
    if not device:
        device = db.query(Device).filter(Device.device_code == device_code).first()

    if not device:
        device = Device(
            device_code=device_code,
            acs_device_id=acs_id,
            first_seen=last_inform or datetime.now(timezone.utc),
        )
        db.add(device)
        db.flush()

    # Device is the stable physical asset. ProductClass remains descriptive,
    # while every ACS representation is persisted separately below.
    device.serial_number = serial or device.serial_number
    device.oui = oui or device.oui
    device.manufacturer = manufacturer or device.manufacturer
    # ModelName is authoritative. Generic ProductClass values such as
    # Device2/IGD must never overwrite a previously resolved model.
    device.model = resolved_model or device.model
    device.product_class = product_class or device.product_class
    device.software_version = software_version or device.software_version
    device.hardware_version = hardware_version or device.hardware_version

    if last_inform and (device.last_seen is None or last_inform > device.last_seen):
        device.last_seen = last_inform
        device.acs_last_inform = last_inform
        device.raw_acs_payload = acs_device

    presence = classify_presence(device.last_seen)
    device.online = presence.online
    device.status = presence.state

    db.flush()
    _upsert_acs_identity(
        db,
        device=device,
        acs_id=acs_id,
        serial=serial,
        oui=oui,
        manufacturer=manufacturer,
        product_class=product_class,
        software_version=software_version,
        hardware_version=hardware_version,
        last_inform=last_inform,
        raw_payload=acs_device,
    )
    db.flush()

    preferred = _select_preferred_identity(db, device)
    if preferred:
        device.acs_device_id = preferred.acs_device_id
        device.product_class = preferred.product_class or device.product_class
        preferred_model = resolve_model(
            preferred.raw_acs_payload or {},
            preferred.product_class,
        )
        device.model = preferred_model or device.model
        device.software_version = preferred.software_version or device.software_version
        device.hardware_version = preferred.hardware_version or device.hardware_version

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
        upsert_device_parameter(db, device.id, name, value)

    db.commit()
    db.refresh(device)
    return device
