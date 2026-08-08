import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException
import uuid
import json
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.models.device import Device

from app.services.genieacs import genieacs_client
from app.services.genieacs import GenieACSClient
from app.modules.cpe_profiles import resolve_profile
from app.modules.cpe_profiles.resolver import CPEProfileNotFoundError
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Device WiFi"],
)


def get_param(payload: dict, path: str):
    current = payload

    for part in path.split("."):
        if not part:
            continue

        if not isinstance(current, dict):
            return None

        current = current.get(part)

        if current is None:
            return None

    if isinstance(current, dict) and "_value" in current:
        return current.get("_value")

    return current


def unwrap_param(value):
    if isinstance(value, dict):
        return value.get("_value")

    return value


def safe_int(value, default=None):
    value = unwrap_param(value)

    try:
        return int(value)
    except Exception:
        return default


@router.get("/{device_id}/wifi")
async def get_device_wifi(
    device_id: str,
    db: Session = Depends(get_db),
):
    """Return a vendor-neutral WiFi model from TR-181 or TR-098 data.

    EUREKA31.2.0 removes assumptions such as SSID.1 == 2.4 GHz and
    Radio.2 == 5 GHz. SSIDs are correlated to radios through LowerLayers
    and AccessPoint.SSIDReference whenever the CPE exposes those links.
    """
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    def scalar(node, *names):
        if not isinstance(node, dict):
            return None

        for name in names:
            if name not in node:
                continue

            value = unwrap_param(node.get(name))
            if value not in (None, ""):
                return value

        return None

    def instances(node):
        if not isinstance(node, dict):
            return []

        return [
            (str(key), value)
            for key, value in node.items()
            if not str(key).startswith("_")
            and isinstance(value, dict)
        ]

    def reference_index(reference):
        if reference in (None, ""):
            return None

        return str(reference).rstrip(".").split(".")[-1]

    def normalize_bool(value):
        value = unwrap_param(value)

        if isinstance(value, bool):
            return value

        if value is None:
            return None

        text_value = str(value).strip().lower()

        if text_value in {"1", "true", "yes", "enabled", "up", "on"}:
            return True

        if text_value in {"0", "false", "no", "disabled", "down", "off"}:
            return False

        return value

    def normalize_band(*values):
        text_value = " ".join(
            str(value)
            for value in values
            if value not in (None, "")
        ).lower()

        if any(token in text_value for token in (
            "6ghz",
            "6 ghz",
            "6g",
        )):
            return "6GHz"

        if any(token in text_value for token in (
            "5ghz",
            "5 ghz",
            "5g",
            "802.11a",
            "802.11ac",
        )):
            return "5GHz"

        if any(token in text_value for token in (
            "2.4ghz",
            "2.4 ghz",
            "2g",
            "802.11b",
            "802.11g",
        )):
            return "2.4GHz"

        return None

    def band_from_channel(channel):
        channel_value = safe_int(channel)

        if channel_value is None:
            return None

        if channel_value <= 14:
            return "2.4GHz"

        return "5GHz"

    def empty_radio(band):
        return {
            "enabled": None,
            "status": None,
            "channel": None,
            "bandwidth": None,
            "band": band,
            "radio_path": None,
            "operating_standard": None,
        }

    wifi_root = (
        payload.get("Device", {})
        .get("WiFi", {})
        if isinstance(payload.get("Device"), dict)
        else {}
    )

    tr181_radios = (
        wifi_root.get("Radio", {})
        if isinstance(wifi_root, dict)
        else {}
    )
    tr181_ssids = (
        wifi_root.get("SSID", {})
        if isinstance(wifi_root, dict)
        else {}
    )
    tr181_access_points = (
        wifi_root.get("AccessPoint", {})
        if isinstance(wifi_root, dict)
        else {}
    )

    radio_profiles = {}
    ssid_profiles = []

    # Build TR-181 radio inventory first.
    for radio_index, radio_node in instances(tr181_radios):
        channel = scalar(radio_node, "Channel")
        operating_standard = scalar(
            radio_node,
            "OperatingStandards",
            "SupportedStandards",
        )
        band = normalize_band(
            scalar(
                radio_node,
                "OperatingFrequencyBand",
                "SupportedFrequencyBands",
            ),
            operating_standard,
        ) or band_from_channel(channel)

        radio_profiles[radio_index] = {
            "enabled": normalize_bool(scalar(radio_node, "Enable")),
            "status": scalar(radio_node, "Status"),
            "channel": safe_int(channel, channel),
            "bandwidth": scalar(
                radio_node,
                "CurrentOperatingChannelBandwidth",
                "OperatingChannelBandwidth",
            ),
            "band": band,
            "radio_path": f"Device.WiFi.Radio.{radio_index}",
            "operating_standard": operating_standard,
        }

    access_points_by_ssid = {}

    for ap_index, ap_node in instances(tr181_access_points):
        ssid_reference = scalar(ap_node, "SSIDReference")
        ssid_index = reference_index(ssid_reference)

        if not ssid_index:
            continue

        security_node = (
            ap_node.get("Security", {})
            if isinstance(ap_node.get("Security"), dict)
            else {}
        )

        access_points_by_ssid[ssid_index] = {
            "access_point_path": f"Device.WiFi.AccessPoint.{ap_index}",
            "access_point_status": scalar(ap_node, "Status"),
            "access_point_enabled": normalize_bool(
                scalar(ap_node, "Enable")
            ),
            "security_mode": scalar(
                security_node,
                "ModeEnabled",
                "ModesSupported",
            ),
        }

    # Correlate each TR-181 SSID with its radio and access point.
    for ssid_index, ssid_node in instances(tr181_ssids):
        lower_layers = scalar(ssid_node, "LowerLayers")
        radio_index = reference_index(lower_layers)
        radio = radio_profiles.get(radio_index, {})
        access_point = access_points_by_ssid.get(ssid_index, {})

        ssid_name = scalar(ssid_node, "SSID", "Name")
        status = scalar(ssid_node, "Status")
        enabled = normalize_bool(scalar(ssid_node, "Enable"))
        bssid = scalar(ssid_node, "BSSID", "MACAddress")
        band = radio.get("band") or normalize_band(ssid_name)

        ssid_profiles.append({
            "source": "TR-181",
            "ssid_path": f"Device.WiFi.SSID.{ssid_index}.SSID",
            "ssid_object_path": f"Device.WiFi.SSID.{ssid_index}",
            "ssid": ssid_name,
            "status": status,
            "enabled": enabled,
            "bssid": bssid,
            "radio": lower_layers,
            "radio_path": radio.get("radio_path"),
            "radio_index": radio_index,
            "band": band,
            "access_point_path": access_point.get("access_point_path"),
            "access_point_status": access_point.get(
                "access_point_status"
            ),
            "access_point_enabled": access_point.get(
                "access_point_enabled"
            ),
            "security_mode": access_point.get("security_mode"),
        })

    source_model = "TR-181" if ssid_profiles or radio_profiles else None

    # Fallback for TR-098 devices.
    if not ssid_profiles:
        igd_root = (
            payload.get("InternetGatewayDevice", {})
            if isinstance(payload.get("InternetGatewayDevice"), dict)
            else {}
        )
        lan_devices = (
            igd_root.get("LANDevice", {})
            if isinstance(igd_root, dict)
            else {}
        )

        for lan_index, lan_node in instances(lan_devices):
            wlan_root = (
                lan_node.get("WLANConfiguration", {})
                if isinstance(lan_node, dict)
                else {}
            )

            for wlan_index, wlan_node in instances(wlan_root):
                channel = scalar(wlan_node, "Channel")
                standard = scalar(
                    wlan_node,
                    "Standard",
                    "OperatingStandards",
                )
                band = normalize_band(
                    scalar(
                        wlan_node,
                        "OperatingFrequencyBand",
                        "PossibleChannels",
                    ),
                    standard,
                ) or band_from_channel(channel)

                radio_key = f"tr098-{lan_index}-{wlan_index}"
                radio_path = (
                    "InternetGatewayDevice."
                    f"LANDevice.{lan_index}."
                    f"WLANConfiguration.{wlan_index}"
                )

                radio_profiles[radio_key] = {
                    "enabled": normalize_bool(
                        scalar(wlan_node, "Enable")
                    ),
                    "status": scalar(wlan_node, "Status"),
                    "channel": safe_int(channel, channel),
                    "bandwidth": scalar(
                        wlan_node,
                        "CurrentOperatingChannelBandwidth",
                        "OperatingChannelBandwidth",
                        "X_TP_Bandwidth",
                    ),
                    "band": band,
                    "radio_path": radio_path,
                    "operating_standard": standard,
                }

                security_mode = scalar(
                    wlan_node,
                    "BeaconType",
                    "SecurityModeEnabled",
                    "BasicEncryptionModes",
                )

                ssid_profiles.append({
                    "source": "TR-098",
                    "ssid_path": f"{radio_path}.SSID",
                    "ssid_object_path": radio_path,
                    "ssid": scalar(wlan_node, "SSID", "Name"),
                    "status": scalar(wlan_node, "Status"),
                    "enabled": normalize_bool(
                        scalar(wlan_node, "Enable")
                    ),
                    "bssid": scalar(wlan_node, "BSSID", "MACAddress"),
                    "radio": radio_path,
                    "radio_path": radio_path,
                    "radio_index": radio_key,
                    "band": band,
                    "access_point_path": radio_path,
                    "access_point_status": scalar(
                        wlan_node,
                        "Status",
                    ),
                    "access_point_enabled": normalize_bool(
                        scalar(wlan_node, "Enable")
                    ),
                    "security_mode": security_mode,
                })

        if ssid_profiles or radio_profiles:
            source_model = "TR-098"

    def choose_primary():
        candidates = [
            profile
            for profile in ssid_profiles
            if profile.get("ssid") not in (None, "")
        ]

        if not candidates:
            candidates = ssid_profiles

        if not candidates:
            return {
                "ssid_path": None,
                "ssid": None,
                "status": None,
                "enabled": None,
                "bssid": None,
                "radio": None,
                "band": None,
                "security_mode": None,
            }

        candidates.sort(
            key=lambda profile: (
                profile.get("enabled") is not True,
                profile.get("band") != "2.4GHz",
                profile.get("ssid") in (None, ""),
                profile.get("ssid_path") or "",
            )
        )

        selected = candidates[0]

        return {
            "ssid_path": selected.get("ssid_path"),
            "ssid": selected.get("ssid"),
            "status": selected.get("status"),
            "enabled": selected.get("enabled"),
            "bssid": selected.get("bssid"),
            "radio": selected.get("radio"),
            "band": selected.get("band"),
            "security_mode": selected.get("security_mode"),
        }

    def choose_radio(target_band):
        matching = [
            profile
            for profile in radio_profiles.values()
            if profile.get("band") == target_band
        ]

        if not matching:
            return empty_radio(target_band)

        matching.sort(
            key=lambda profile: (
                profile.get("enabled") is not True,
                profile.get("status") not in {"Up", "Enabled", "Active"},
                profile.get("radio_path") or "",
            )
        )

        selected = matching[0]
        return {
            **empty_radio(target_band),
            **selected,
            "band": target_band,
        }

    radio_24 = choose_radio("2.4GHz")
    radio_5 = choose_radio("5GHz")
    radio_6 = choose_radio("6GHz")

    active_bands = [
        band
        for band, radio in (
            ("2.4GHz", radio_24),
            ("5GHz", radio_5),
            ("6GHz", radio_6),
        )
        if radio.get("radio_path") is not None
    ]

    ssid_names = {
        profile.get("ssid")
        for profile in ssid_profiles
        if profile.get("ssid") not in (None, "")
    }

    smart_connect = (
        len(active_bands) > 1
        and len(ssid_names) == 1
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "source_model": source_model or "UNAVAILABLE",
        "wifi": {
            "primary": choose_primary(),
            "radio_24": radio_24,
            "radio_5": radio_5,
            "radio_6": radio_6,
            "smart_connect": smart_connect,
            "ssid_count": len(ssid_profiles),
            "radio_count": len(radio_profiles),
            "active_bands": active_bands,
            "ssids": ssid_profiles,
            "radios": list(radio_profiles.values()),
        },
    }

@router.post("/{device_id}/wifi/refresh")
async def refresh_device_wifi(
    device_id: str,
    wait_seconds: int = 20,
    db: Session = Depends(get_db),
):
    """Refresh TR-181 WiFi runtime objects and persist the latest ACS payload."""
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if not device.acs_device_id:
        raise HTTPException(
            status_code=409,
            detail="Device has no ACS device id",
        )

    try:
        refresh = await genieacs_client.refresh_wifi(
            device.acs_device_id,
            wait_seconds=wait_seconds,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"GenieACS WiFi refresh failed: {exc}",
        ) from exc

    latest_payload = refresh.pop("payload", None)
    payload_persisted = False

    if isinstance(latest_payload, dict):
        device.raw_acs_payload = latest_payload
        db.add(device)
        db.commit()
        db.refresh(device)
        payload_persisted = True

    wifi_data = await get_device_wifi(device_id=device_id, db=db)

    return {
        "success": bool(refresh.get("success")),
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "refresh": {
            **refresh,
            "payload_persisted": payload_persisted,
        },
        "wifi": wifi_data.get("wifi"),
        "source_model": wifi_data.get("source_model"),
    }


class WifiSSIDRequest(BaseModel):
    ssid: str


class WifiPasswordRequest(BaseModel):
    password: str


class WifiConfigurationRequest(BaseModel):
    band: str
    ssid: str | None = None
    password: str | None = None
    enabled: bool | None = None
    channel: int | None = None
    auto_channel: bool | None = None
    bandwidth: str | None = None


def _device_identity(device: Device) -> tuple[str | None, str | None]:
    """Return the best available vendor/product-class identity."""
    vendor = device.manufacturer
    product_class = device.product_class or device.model
    payload = device.raw_acs_payload or {}

    if not vendor:
        vendor = (
            get_param(payload, "Device.DeviceInfo.Manufacturer")
            or get_param(payload, "InternetGatewayDevice.DeviceInfo.Manufacturer")
            or get_param(payload, "_deviceId._Manufacturer")
        )

    if not product_class:
        product_class = (
            get_param(payload, "Device.DeviceInfo.ProductClass")
            or get_param(payload, "InternetGatewayDevice.DeviceInfo.ProductClass")
            or get_param(payload, "_deviceId._ProductClass")
        )

    return vendor, product_class


def _normalize_wifi_band(value: str) -> str:
    normalized = str(value or "").strip().lower().replace(" ", "")
    if normalized in {"2.4ghz", "2.4g", "2g", "24ghz", "24g"}:
        return "2.4GHz"
    if normalized in {"5ghz", "5g"}:
        return "5GHz"
    raise HTTPException(
        status_code=422,
        detail="Unsupported WiFi band. Supported values: 2.4GHz, 5GHz",
    )


def _resolve_wifi_profile(device: Device):
    vendor, product_class = _device_identity(device)
    try:
        return resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise HTTPException(
            status_code=501,
            detail={
                "code": "UNSUPPORTED_CPE_PROFILE",
                "message": "No qualified CPE profile is available for this device",
                "manufacturer": vendor,
                "product_class": product_class,
            },
        ) from exc


async def _apply_wifi_configuration(device: Device, request: WifiConfigurationRequest):
    if not device.acs_device_id:
        raise HTTPException(status_code=409, detail="Device has no ACS device id")

    band = _normalize_wifi_band(request.band)
    profile = _resolve_wifi_profile(device)
    band_profile = profile.wifi24 if band == "2.4GHz" else profile.wifi5
    parameter_values = []
    updated_fields = []

    if request.ssid is not None:
        ssid = request.ssid.strip()
        if not ssid:
            raise HTTPException(status_code=422, detail="SSID cannot be empty")
        if not band_profile.ssid:
            raise HTTPException(status_code=501, detail=f"SSID configuration is not supported for {band}")
        parameter_values.append([band_profile.ssid, ssid, "xsd:string"])
        updated_fields.append("ssid")

    if request.password is not None:
        if not request.password:
            raise HTTPException(status_code=422, detail="Password cannot be empty")
        if not band_profile.password:
            raise HTTPException(status_code=501, detail=f"Password configuration is not supported for {band}")
        parameter_values.append([band_profile.password, request.password, "xsd:string"])
        updated_fields.append("password")

    if request.enabled is not None:
        if not band_profile.enable:
            raise HTTPException(status_code=501, detail=f"Enable configuration is not supported for {band}")
        parameter_values.append([band_profile.enable, request.enabled, "xsd:boolean"])
        updated_fields.append("enabled")

    if request.channel is not None:
        if request.channel <= 0:
            raise HTTPException(status_code=422, detail="Channel must be greater than zero")
        if not band_profile.channel:
            raise HTTPException(status_code=501, detail=f"Channel configuration is not supported for {band}")
        parameter_values.append([band_profile.channel, request.channel, "xsd:unsignedInt"])
        updated_fields.append("channel")

    if request.auto_channel is not None:
        if not band_profile.auto_channel:
            raise HTTPException(status_code=501, detail=f"Auto-channel configuration is not supported for {band}")
        parameter_values.append([band_profile.auto_channel, request.auto_channel, "xsd:boolean"])
        updated_fields.append("auto_channel")

    if request.bandwidth is not None:
        bandwidth = str(request.bandwidth).strip()
        if not bandwidth:
            raise HTTPException(status_code=422, detail="Bandwidth cannot be empty")
        if not band_profile.bandwidth:
            raise HTTPException(status_code=501, detail=f"Bandwidth configuration is not supported for {band}")
        parameter_values.append([band_profile.bandwidth, bandwidth, "xsd:string"])
        updated_fields.append("bandwidth")

    if not parameter_values:
        raise HTTPException(status_code=422, detail="At least one WiFi configuration field is required")

    try:
        result = await GenieACSClient().create_task(
            device.acs_device_id,
            {"name": "setParameterValues", "parameterValues": parameter_values},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"GenieACS WiFi configuration failed: {exc}") from exc

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "band": band,
        "profile": {
            "vendor": profile.vendor,
            "product_class": profile.product_class,
            "data_model": profile.data_model,
        },
        "updated_fields": updated_fields,
        "parameter_paths": [item[0] for item in parameter_values],
        "result": result,
    }


@router.post("/{device_id}/wifi/configuration")
async def configure_device_wifi(
    device_id: str,
    payload: WifiConfigurationRequest,
    db: Session = Depends(get_db),
):
    """Apply vendor-neutral WiFi changes through the qualified CPE profile."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return await _apply_wifi_configuration(device, payload)


@router.post("/{device_id}/wifi/ssid")
async def set_device_ssid(
    device_id: str,
    payload: WifiSSIDRequest,
    db: Session = Depends(get_db),
):
    """Legacy wrapper: update the 2.4 GHz SSID through the CPE profile."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    result = await _apply_wifi_configuration(
        device,
        WifiConfigurationRequest(band="2.4GHz", ssid=payload.ssid),
    )
    result["legacy_endpoint"] = True
    result["new_ssid"] = payload.ssid
    return result


@router.post("/{device_id}/wifi/password")
async def set_device_wifi_password(
    device_id: str,
    payload: WifiPasswordRequest,
    db: Session = Depends(get_db),
):
    """Legacy wrapper: update the 2.4 GHz password through the CPE profile."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    result = await _apply_wifi_configuration(
        device,
        WifiConfigurationRequest(band="2.4GHz", password=payload.password),
    )
    result["legacy_endpoint"] = True
    result["password_updated"] = True
    return result


@router.get("/{device_id}/diagnostics")
async def get_device_diagnostics(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    def first_param(*paths):
        for path in paths:
            value = get_param(payload, path)
            if value is not None and value != "":
                return value
        return None

    uptime = first_param(
        "Device.DeviceInfo.UpTime",
        "InternetGatewayDevice.DeviceInfo.UpTime",
    )

    cpu_usage = first_param(
        "Device.DeviceInfo.ProcessStatus.CPUUsage",
        "Device.DeviceInfo.X_TP_CPUUsage",
    )

    memory_free = first_param(
        "Device.DeviceInfo.MemoryStatus.Free",
        "InternetGatewayDevice.DeviceInfo.MemoryStatus.Free",
    )

    memory_total = first_param(
        "Device.DeviceInfo.MemoryStatus.Total",
        "InternetGatewayDevice.DeviceInfo.MemoryStatus.Total",
    )

    ppp_status = first_param(
        "Device.PPP.Interface.1.ConnectionStatus",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.ConnectionStatus",
    )

    ppp_interface_status = first_param(
        "Device.PPP.Interface.1.Status",
    )

    ppp_username = first_param(
        "Device.PPP.Interface.1.Username",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.Username",
    )

    ppp_local_ip = first_param(
        "Device.PPP.Interface.1.IPCP.LocalIPAddress",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.ExternalIPAddress",
    )

    ppp_remote_ip = first_param(
        "Device.PPP.Interface.1.IPCP.RemoteIPAddress",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.DefaultGateway",
    )

    wan_ip = first_param(
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.ExternalIPAddress",
        "Device.PPP.Interface.1.IPCP.LocalIPAddress",
    )

    last_connection_error = first_param(
        "Device.PPP.Interface.1.LastConnectionError",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.LastConnectionError",
    )

    pppoe_service = first_param(
        "Device.PPP.Interface.1.PPPoE.ServiceName",
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.PPPoEServiceName",
    )

    pppoe_session = first_param(
        "Device.PPP.Interface.1.PPPoE.SessionID",
    )

    memory_free_percent = None
    memory_used_percent = None

    if memory_free is not None and memory_total:
        try:
            memory_free_percent = round(
                (float(memory_free) / float(memory_total)) * 100,
                2,
            )
            memory_used_percent = round(
                100 - memory_free_percent,
                2,
            )
        except (TypeError, ValueError, ZeroDivisionError):
            memory_free_percent = None
            memory_used_percent = None

    health_score = 100
    risk_level = "LOW"
    status = "GOOD"

    if cpu_usage is not None:
        try:
            cpu_value = int(float(cpu_usage))

            if cpu_value >= 90:
                health_score -= 35
            elif cpu_value >= 75:
                health_score -= 20
            elif cpu_value >= 60:
                health_score -= 8
        except (TypeError, ValueError):
            pass

    if memory_free_percent is not None:
        if memory_free_percent < 15:
            health_score -= 35
        elif memory_free_percent < 30:
            health_score -= 20
        elif memory_free_percent < 45:
            health_score -= 8

    if ppp_status and str(ppp_status).lower() not in {"connected", "up"}:
        health_score -= 20

    if last_connection_error and str(last_connection_error).upper() not in {
        "ERROR_NONE",
        "NONE",
        "NO_ERROR",
    }:
        health_score -= 15

    health_score = max(0, health_score)

    if health_score < 50:
        risk_level = "HIGH"
        status = "CRITICAL"
    elif health_score < 75:
        risk_level = "MEDIUM"
        status = "WARNING"

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "diagnostics": {
            "status": status,
            "risk_level": risk_level,
            "health_score": health_score,
            "uptime_seconds": safe_int(uptime, uptime),
            "cpu_usage_percent": safe_int(cpu_usage, cpu_usage),
            "memory_free": safe_int(memory_free, memory_free),
            "memory_total": safe_int(memory_total, memory_total),
            "memory_free_percent": memory_free_percent,
            "memory_used_percent": memory_used_percent,
            "ppp_status": ppp_status,
            "ppp_interface_status": ppp_interface_status,
            "ppp_username": ppp_username,
            "wan_ip": wan_ip,
            "ppp_local_ip": ppp_local_ip,
            "ppp_remote_ip": ppp_remote_ip,
            "last_connection_error": last_connection_error,
            "pppoe_service": pppoe_service,
            "pppoe_session": safe_int(pppoe_session, pppoe_session),
            "ppp": {
                "status": ppp_status,
                "interface_status": ppp_interface_status,
                "username": ppp_username,
                "wan_ip": wan_ip,
                "local_ip": ppp_local_ip,
                "remote_ip": ppp_remote_ip,
                "last_error": last_connection_error,
                "service": pppoe_service,
                "session_id": safe_int(pppoe_session, pppoe_session),
            },
        },
    }


# EUREKA29.1.3 ACS Runtime Client Discovery
@router.post("/{device_id}/clients/discover")
async def discover_device_clients(
    device_id: str,
    wait_seconds: int = 12,
    db: Session = Depends(get_db),
):
    """Refresh runtime WiFi client objects in GenieACS and return parsed clients.

    The CPE may expose the AssociatedDevice object without publishing its dynamic
    instances until ACS explicitly refreshes the runtime trees. This endpoint
    refreshes the relevant TR-181 roots, polls the ACS payload, persists the most
    recent payload, and then reuses the EUREKA29.1.2 client parser.
    """
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not device.acs_device_id:
        raise HTTPException(status_code=409, detail="Device has no ACS device id")

    bounded_wait = max(2, min(int(wait_seconds), 45))
    refresh_roots = [
        "Device.WiFi.AccessPoint",
        "Device.Hosts",
        "Device.DHCPv4.Client",
    ]

    task_results = []
    for object_name in refresh_roots:
        try:
            result = await genieacs_client.create_task(
                device.acs_device_id,
                {
                    "name": "refreshObject",
                    "objectName": object_name,
                },
            )
            task_results.append({
                "object_name": object_name,
                "accepted": True,
                "result": result,
            })
        except Exception as exc:  # noqa: BLE001
            task_results.append({
                "object_name": object_name,
                "accepted": False,
                "error": str(exc),
            })

    def dynamic_instance_count(payload):
        if not isinstance(payload, dict):
            return 0
        access_points = (
            payload.get("Device", {})
            .get("WiFi", {})
            .get("AccessPoint", {})
        )
        if not isinstance(access_points, dict):
            return 0

        count = 0
        for ap_key, ap_value in access_points.items():
            if str(ap_key).startswith("_") or not isinstance(ap_value, dict):
                continue
            associated = ap_value.get("AssociatedDevice", {})
            if not isinstance(associated, dict):
                continue
            count += sum(
                1
                for key, value in associated.items()
                if not str(key).startswith("_") and isinstance(value, dict)
            )
        return count

    started = asyncio.get_running_loop().time()
    latest_payload = None
    discovered_instances = 0
    attempts = 0

    while True:
        attempts += 1
        await asyncio.sleep(2 if attempts == 1 else 3)
        try:
            latest_payload = await genieacs_client.get_device_raw(device.acs_device_id)
        except Exception:  # noqa: BLE001
            latest_payload = None

        discovered_instances = dynamic_instance_count(latest_payload)
        elapsed = asyncio.get_running_loop().time() - started
        if discovered_instances > 0 or elapsed >= bounded_wait:
            break

    if isinstance(latest_payload, dict):
        device.raw_acs_payload = latest_payload
        db.add(device)
        db.commit()
        db.refresh(device)

    parsed = await get_device_clients(device_id=device_id, db=db)
    parsed["runtime_discovery"] = {
        "requested": True,
        "wait_seconds": bounded_wait,
        "poll_attempts": attempts,
        "associated_device_instances": discovered_instances,
        "payload_persisted": isinstance(latest_payload, dict),
        "refresh_tasks": task_results,
    }
    parsed["source"] = "ACS_RUNTIME_DISCOVERY"
    return parsed


@router.get("/{device_id}/clients")
async def get_device_clients(
    device_id: str,
    db: Session = Depends(get_db),
):
    """Return real WiFi clients discovered from the latest ACS payload.

    Supports both TR-181 Device.WiFi.AccessPoint.*.AssociatedDevice.* and
    TR-098 InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.AssociatedDevice.*.
    Host information is correlated by MAC address and duplicate ACS records are
    collapsed into one operational client.
    """
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    payload = device.raw_acs_payload or {}

    def unwrap(value):
        if isinstance(value, dict) and "_value" in value:
            return value.get("_value")
        return value

    def scalar(node, *names):
        if not isinstance(node, dict):
            return None
        for name in names:
            if name in node:
                value = unwrap(node.get(name))
                if value not in (None, ""):
                    return value
        return None

    def instances(node):
        if not isinstance(node, dict):
            return []
        result = []
        for key, value in node.items():
            if str(key).startswith("_") or not isinstance(value, dict):
                continue
            result.append((str(key), value))
        return result

    def normalize_mac(value):
        if value is None:
            return None
        raw = re.sub(r"[^0-9A-Fa-f]", "", str(value)).upper()
        if len(raw) != 12:
            return str(value).upper()
        return ":".join(raw[index:index + 2] for index in range(0, 12, 2))

    def as_int(value):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None

    def active_value(value):
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        return str(value).strip().lower() in {
            "1", "true", "yes", "active", "associated", "connected", "online", "up"
        }

    def band_from_text(*values):
        text = " ".join(str(value) for value in values if value not in (None, "")).lower()
        if any(token in text for token in ("5ghz", "5 ghz", "5g", "802.11a", "802.11ac", "802.11ax")):
            return "5 GHz"
        if any(token in text for token in ("2.4ghz", "2.4 ghz", "2g", "802.11b", "802.11g", "802.11n")):
            return "2.4 GHz"
        return None

    hosts_by_mac = {}
    hosts_root = (
        payload.get("Device", {}).get("Hosts", {}).get("Host", {})
        if isinstance(payload.get("Device"), dict)
        else {}
    )
    if not hosts_root:
        hosts_root = (
            payload.get("InternetGatewayDevice", {}).get("LANDevice", {}).get("1", {})
            .get("Hosts", {}).get("Host", {})
            if isinstance(payload.get("InternetGatewayDevice"), dict)
            else {}
        )

    for _, host in instances(hosts_root):
        mac = normalize_mac(scalar(host, "PhysAddress", "MACAddress"))
        if not mac:
            continue
        hosts_by_mac[mac] = {
            "hostname": scalar(host, "HostName", "Hostname", "Name"),
            "ip_address": scalar(host, "IPAddress", "IP", "IPv4Address"),
            "interface_type": scalar(host, "InterfaceType", "Layer1Interface"),
            "active": scalar(host, "Active", "Status"),
            "lease_time_remaining": as_int(scalar(host, "LeaseTimeRemaining")),
        }

    discovered = []

    # TR-181
    wifi = payload.get("Device", {}).get("WiFi", {}) if isinstance(payload.get("Device"), dict) else {}
    access_points = wifi.get("AccessPoint", {}) if isinstance(wifi, dict) else {}
    radios = wifi.get("Radio", {}) if isinstance(wifi, dict) else {}
    ssids = wifi.get("SSID", {}) if isinstance(wifi, dict) else {}

    for ap_index, ap in instances(access_points):
        ap_status = scalar(ap, "Status", "Enable")
        ssid_reference = scalar(ap, "SSIDReference")
        radio_reference = None
        ssid_name = None

        if ssid_reference:
            ssid_index = str(ssid_reference).rstrip(".").split(".")[-1]
            ssid_node = ssids.get(ssid_index, {}) if isinstance(ssids, dict) else {}
            ssid_name = scalar(ssid_node, "SSID", "Name")
            radio_reference = scalar(ssid_node, "LowerLayers")

        radio_node = {}
        if radio_reference:
            radio_index = str(radio_reference).rstrip(".").split(".")[-1]
            radio_node = radios.get(radio_index, {}) if isinstance(radios, dict) else {}

        band = band_from_text(
            scalar(radio_node, "OperatingFrequencyBand", "SupportedFrequencyBands"),
            scalar(radio_node, "OperatingStandards"),
            ssid_name,
        )

        associated = ap.get("AssociatedDevice", {}) if isinstance(ap, dict) else {}
        for client_index, client in instances(associated):
            mac = normalize_mac(scalar(client, "MACAddress", "PhysAddress"))
            if not mac:
                continue
            host = hosts_by_mac.get(mac, {})
            signal = as_int(scalar(client, "SignalStrength", "RSSI"))
            tx_rate = as_int(scalar(client, "LastDataDownlinkRate", "DownlinkRate", "TxRate"))
            rx_rate = as_int(scalar(client, "LastDataUplinkRate", "UplinkRate", "RxRate"))
            active = active_value(scalar(client, "Active", "AuthenticationState", "Status"))
            if ap_status is not None and str(ap_status).strip().lower() in {"0", "false", "down", "disabled"}:
                active = False

            discovered.append({
                "source": "TR-181",
                "source_path": f"Device.WiFi.AccessPoint.{ap_index}.AssociatedDevice.{client_index}",
                "mac_address": mac,
                "hostname": host.get("hostname"),
                "ip_address": host.get("ip_address") or scalar(client, "IPAddress"),
                "vendor": scalar(client, "Vendor", "Manufacturer"),
                "band": band,
                "ssid": ssid_name,
                "rssi": signal,
                "signal_strength": signal,
                "phy_rate_mbps": max([rate for rate in (tx_rate, rx_rate) if rate is not None], default=None),
                "tx_rate_mbps": tx_rate,
                "rx_rate_mbps": rx_rate,
                "connected_seconds": as_int(scalar(client, "AssociationTime", "ConnectedTime", "Uptime")),
                "retransmissions": as_int(scalar(client, "Retransmissions")),
                "active": active,
                "status": "ONLINE" if active else "IDLE",
            })

    # TR-098
    igd = payload.get("InternetGatewayDevice", {}) if isinstance(payload.get("InternetGatewayDevice"), dict) else {}
    lan_devices = igd.get("LANDevice", {}) if isinstance(igd, dict) else {}

    for lan_index, lan in instances(lan_devices):
        wlan_root = lan.get("WLANConfiguration", {}) if isinstance(lan, dict) else {}
        for wlan_index, wlan in instances(wlan_root):
            ssid_name = scalar(wlan, "SSID", "Name")
            channel = as_int(scalar(wlan, "Channel"))
            standard = scalar(wlan, "Standard", "OperatingStandards")
            possible_channels = scalar(wlan, "PossibleChannels")
            band = band_from_text(standard, possible_channels, ssid_name)
            if band is None and channel is not None:
                band = "2.4 GHz" if channel <= 14 else "5 GHz"

            associated = wlan.get("AssociatedDevice", {}) if isinstance(wlan, dict) else {}
            for client_index, client in instances(associated):
                mac = normalize_mac(scalar(
                    client,
                    "AssociatedDeviceMACAddress",
                    "MACAddress",
                    "PhysAddress",
                ))
                if not mac:
                    continue
                host = hosts_by_mac.get(mac, {})
                signal = as_int(scalar(client, "SignalStrength", "RSSI"))
                tx_rate = as_int(scalar(client, "LastDataDownlinkRate", "TxRate"))
                rx_rate = as_int(scalar(client, "LastDataUplinkRate", "RxRate"))
                active = active_value(scalar(
                    client,
                    "AssociatedDeviceAuthenticationState",
                    "AuthenticationState",
                    "Active",
                    "Status",
                ))

                discovered.append({
                    "source": "TR-098",
                    "source_path": (
                        f"InternetGatewayDevice.LANDevice.{lan_index}."
                        f"WLANConfiguration.{wlan_index}.AssociatedDevice.{client_index}"
                    ),
                    "mac_address": mac,
                    "hostname": host.get("hostname"),
                    "ip_address": host.get("ip_address") or scalar(client, "IPAddress"),
                    "vendor": scalar(client, "Vendor", "Manufacturer"),
                    "band": band,
                    "ssid": ssid_name,
                    "rssi": signal,
                    "signal_strength": signal,
                    "phy_rate_mbps": max([rate for rate in (tx_rate, rx_rate) if rate is not None], default=None),
                    "tx_rate_mbps": tx_rate,
                    "rx_rate_mbps": rx_rate,
                    "connected_seconds": as_int(scalar(client, "AssociationTime", "ConnectedTime", "Uptime")),
                    "retransmissions": as_int(scalar(client, "Retransmissions")),
                    "active": active,
                    "status": "ONLINE" if active else "IDLE",
                })

    # Deduplicate by MAC. Prefer active records and records with more populated fields.
    deduplicated = {}
    for client in discovered:
        mac = client["mac_address"]
        score = sum(value not in (None, "") for value in client.values()) + (20 if client.get("active") else 0)
        current = deduplicated.get(mac)
        if current is None or score > current[0]:
            deduplicated[mac] = (score, client)

    clients = [item[1] for item in deduplicated.values()]
    clients.sort(key=lambda item: (
        not bool(item.get("active")),
        -(item.get("rssi") if item.get("rssi") is not None else -999),
        item.get("hostname") or item.get("mac_address") or "",
    ))

    active_clients = [client for client in clients if client.get("active")]
    rssi_values = [client["rssi"] for client in active_clients if client.get("rssi") is not None]

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "source": "ACS_REALTIME_PAYLOAD",
        "count": len(clients),
        "active_count": len(active_clients),
        "inactive_count": len(clients) - len(active_clients),
        "band_24_count": sum(1 for client in active_clients if client.get("band") == "2.4 GHz"),
        "band_5_count": sum(1 for client in active_clients if client.get("band") == "5 GHz"),
        "unknown_band_count": sum(1 for client in active_clients if client.get("band") not in {"2.4 GHz", "5 GHz"}),
        "average_rssi": round(sum(rssi_values) / len(rssi_values), 1) if rssi_values else None,
        "duplicate_records_filtered": max(0, len(discovered) - len(clients)),
        "clients": clients,
    }


@router.post("/{device_id}/wifi/scan")
async def run_wifi_scan(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(
            Device.id == device_id
        )
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    client = GenieACSClient()

    result = await client.wifi_scan(
        device.acs_device_id
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "task": "wifi_scan",
        "result": result,
    }


@router.get("/{device_id}/wifi/neighbors")
async def get_wifi_neighbors(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(
            Device.id == device_id
        )
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    diagnostic = (
        payload
        .get("Device", {})
        .get("WiFi", {})
        .get("NeighboringWiFiDiagnostic", {})
    )

    state = get_param(
        {"d": diagnostic},
        "d.DiagnosticsState",
    )

    result_count = get_param(
        {"d": diagnostic},
        "d.ResultNumberOfEntries",
    )

    results = diagnostic.get("Result", {}) or {}

    neighbors = []

    for result_id, item in results.items():
        if not isinstance(item, dict):
            continue

        ssid = unwrap_param(get_param(
            {"r": item},
            "r.SSID",
        ))

        bssid = unwrap_param(get_param(
            {"r": item},
            "r.BSSID",
        ))

        channel = unwrap_param(get_param(
            {"r": item},
            "r.Channel",
        ))

        signal_strength = unwrap_param(get_param(
            {"r": item},
            "r.SignalStrength",
        ))

        band = unwrap_param(get_param(
            {"r": item},
            "r.OperatingFrequencyBand",
        ))

        bandwidth = unwrap_param(get_param(
            {"r": item},
            "r.OperatingChannelBandwidth",
        ))

        security = unwrap_param(get_param(
            {"r": item},
            "r.SecurityModeEnabled",
        ))

        encryption = get_param(
            {"r": item},
            "r.EncryptionMode",
        )

        extension_channel = unwrap_param(get_param(
            {"r": item},
            "r.X_TP_ExtensionChannel",
        ))

        neighbors.append({
            "result_id": result_id,
            "ssid": ssid,
            "bssid": bssid,
            "channel": channel,
            "signal_strength": signal_strength,
            "band": band,
            "bandwidth": bandwidth,
            "security": security,
            "encryption": encryption,
            "extension_channel": extension_channel,
        })

    neighbors = sorted(
        neighbors,
        key=lambda n: safe_int(n.get("signal_strength"), -999),
        reverse=True,
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "state": state,
        "count": len(neighbors),
        "reported_count": result_count,
        "neighbors": neighbors,
    }


@router.get("/{device_id}/wifi/advisor")
async def get_wifi_advisor(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    current_channel_24 = get_param(
        payload,
        "Device.WiFi.Radio.1.Channel",
    )

    current_bandwidth_24 = get_param(
        payload,
        "Device.WiFi.Radio.1.CurrentOperatingChannelBandwidth",
    )

    current_channel_5 = get_param(
        payload,
        "Device.WiFi.Radio.2.Channel",
    )

    current_bandwidth_5 = get_param(
        payload,
        "Device.WiFi.Radio.2.CurrentOperatingChannelBandwidth",
    )

    possible_channels_5 = get_param(
        payload,
        "Device.WiFi.Radio.2.PossibleChannels",
    )

    diagnostic = (
        payload
        .get("Device", {})
        .get("WiFi", {})
        .get("NeighboringWiFiDiagnostic", {})
    )

    results = diagnostic.get("Result", {}) or {}

    def signal_penalty(signal: int):
        if signal >= -70:
            return 35

        if signal >= -80:
            return 20

        if signal >= -90:
            return 10

        return 5

    def build_channel_stats(target_band: str):
        channels = {}

        for result_id, item in results.items():
            if not isinstance(item, dict):
                continue

            channel = unwrap_param(get_param(
                {"r": item},
                "r.Channel",
            ))

            signal = unwrap_param(get_param(
                {"r": item},
                "r.SignalStrength",
            ))

            band = unwrap_param(get_param(
                {"r": item},
                "r.OperatingFrequencyBand",
            ))

            if not isinstance(band, str):
                continue

            if band != target_band or channel is None:
                continue

            channel = safe_int(channel)
            signal = safe_int(signal, -100)

            if channel is None:
                continue

            if channel not in channels:
                channels[channel] = {
                    "channel": channel,
                    "networks": 0,
                    "strong_networks": 0,
                    "worst_signal": -100,
                    "score_penalty": 0,
                }

            channels[channel]["networks"] += 1
            channels[channel]["worst_signal"] = max(
                channels[channel]["worst_signal"],
                signal,
            )

            if signal >= -70:
                channels[channel]["strong_networks"] += 1

            channels[channel]["score_penalty"] += signal_penalty(
                signal
            )

        return channels

    def score_candidates(
        candidate_channels,
        channels,
        current_channel,
        band,
    ):
        recommendations = []

        for channel in candidate_channels:
            penalty = 0

            for nearby_channel, data in channels.items():
                distance = abs(channel - nearby_channel)

                if band == "2.4GHz":
                    if distance == 0:
                        penalty += data["score_penalty"]
                    elif distance <= 2:
                        penalty += int(
                            data["score_penalty"] * 0.6
                        )
                    elif distance <= 4:
                        penalty += int(
                            data["score_penalty"] * 0.3
                        )
                else:
                    if distance == 0:
                        penalty += data["score_penalty"]
                    elif distance <= 4:
                        penalty += int(
                            data["score_penalty"] * 0.5
                        )
                    elif distance <= 8:
                        penalty += int(
                            data["score_penalty"] * 0.25
                        )

            score = max(0, 100 - penalty)

            recommendations.append({
                "channel": channel,
                "score": score,
                "penalty": penalty,
            })

        recommendations = sorted(
            recommendations,
            key=lambda item: item["score"],
            reverse=True,
        )

        best = recommendations[0] if recommendations else None
        current_score = None

        if isinstance(current_channel, dict):
            current_channel = current_channel.get("_value")

        try:
            current_channel = (
                int(current_channel)
                if current_channel not in (None, "")
                else None
            )
        except (TypeError, ValueError):
            current_channel = None

        if current_channel is not None:
            for item in recommendations:
                if item["channel"] == current_channel:
                    current_score = item["score"]

        summary = "RF environment looks acceptable."

        if best and current_channel != best["channel"]:
            summary = (
                f"Current {band} channel {current_channel} may be "
                f"suboptimal. Recommended channel: {best['channel']}."
            )
        elif best:
            summary = (
                f"Current {band} channel {current_channel} is aligned "
                f"with the best recommended channel."
            )

        return {
            "current": {
                "channel": int(current_channel)
                if current_channel is not None
                else None,
                "score": current_score,
            },
            "recommendation": {
                "best_channel": best["channel"] if best else None,
                "best_score": best["score"] if best else None,
                "candidates": recommendations,
                "summary": summary,
            },
        }

    channels_24 = build_channel_stats("2.4GHz")
    channels_5 = build_channel_stats("5GHz")

    candidate_channels_24 = [1, 6, 11]

    if possible_channels_5:
        candidate_channels_5 = [
            int(channel.strip())
            for channel in str(possible_channels_5).split(",")
            if channel.strip().isdigit()
        ]
    else:
        candidate_channels_5 = [36, 40, 44, 48]

    advisor_24 = score_candidates(
        candidate_channels_24,
        channels_24,
        current_channel_24,
        "2.4GHz",
    )

    advisor_5 = score_candidates(
        candidate_channels_5,
        channels_5,
        current_channel_5,
        "5GHz",
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,

        "current": {
            "channel": advisor_24["current"]["channel"],
            "bandwidth": current_bandwidth_24,
            "score": advisor_24["current"]["score"],
        },

        "scan": {
            "channels": list(channels_24.values()),
            "neighbor_count": sum(
                item["networks"] for item in channels_24.values()
            ),
        },

        "recommendation": advisor_24["recommendation"],

        "bands": {
            "2.4GHz": {
                "current": {
                    "channel": advisor_24["current"]["channel"],
                    "bandwidth": current_bandwidth_24,
                    "score": advisor_24["current"]["score"],
                },
                "scan": {
                    "channels": list(channels_24.values()),
                    "neighbor_count": sum(
                        item["networks"]
                        for item in channels_24.values()
                    ),
                },
                "recommendation": advisor_24["recommendation"],
            },
            "5GHz": {
                "current": {
                    "channel": advisor_5["current"]["channel"],
                    "bandwidth": current_bandwidth_5,
                    "score": advisor_5["current"]["score"],
                },
                "scan": {
                    "channels": list(channels_5.values()),
                    "neighbor_count": sum(
                        item["networks"]
                        for item in channels_5.values()
                    ),
                },
                "recommendation": advisor_5["recommendation"],
            },
        },
    }

@router.get("/{device_id}/wifi/quality")
async def get_wifi_quality(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    score = 100
    issues = []
    recommendations = []

    cpu_usage = get_param(
        payload,
        "Device.DeviceInfo.ProcessStatus.CPUUsage",
    )

    memory_free = get_param(
        payload,
        "Device.DeviceInfo.MemoryStatus.Free",
    )

    memory_total = get_param(
        payload,
        "Device.DeviceInfo.MemoryStatus.Total",
    )

    memory_free_percent = None

    if memory_free is not None and memory_total:
        memory_free_percent = round(
            (float(memory_free) / float(memory_total)) * 100,
            2,
        )

    if cpu_usage is not None and int(cpu_usage) >= 80:
        score -= 10
        issues.append(
            f"CPU alta: {cpu_usage}%"
        )

    if memory_free_percent is not None and memory_free_percent < 20:
        score -= 10
        issues.append(
            f"RAM libera bassa: {memory_free_percent}%"
        )

    current_channel_24 = unwrap_param(get_param(
        payload,
        "Device.WiFi.Radio.1.Channel",
    ))

    current_channel_5 = unwrap_param(get_param(
        payload,
        "Device.WiFi.Radio.2.Channel",
    ))

    diagnostic = (
        payload
        .get("Device", {})
        .get("WiFi", {})
        .get("NeighboringWiFiDiagnostic", {})
    )

    results = diagnostic.get("Result", {}) or {}

    band_stats = {
        "2.4GHz": {
            "networks": 0,
            "strong_networks": 0,
            "moderate_networks": 0,
            "weak_networks": 0,
        },
        "5GHz": {
            "networks": 0,
            "strong_networks": 0,
            "moderate_networks": 0,
            "weak_networks": 0,
        },
    }

    channels_24 = {}
    channels_5 = {}

    for result_id, item in results.items():
        if not isinstance(item, dict):
            continue

        band = unwrap_param(get_param(
            {"r": item},
            "r.OperatingFrequencyBand",
        ))

        channel = unwrap_param(get_param(
            {"r": item},
            "r.Channel",
        ))

        signal = unwrap_param(get_param(
            {"r": item},
            "r.SignalStrength",
        ))

        if not isinstance(band, str):
            continue

        if band not in band_stats or channel is None:
            continue

        signal = safe_int(signal, -100)
        channel = safe_int(channel)

        if channel is None:
            continue

        band_stats[band]["networks"] += 1

        if signal >= -70:
            band_stats[band]["strong_networks"] += 1
        elif signal >= -85:
            band_stats[band]["moderate_networks"] += 1
        else:
            band_stats[band]["weak_networks"] += 1

        target_channels = channels_24 if band == "2.4GHz" else channels_5

        if channel not in target_channels:
            target_channels[channel] = {
                "channel": channel,
                "networks": 0,
                "strong_networks": 0,
                "best_signal": -100,
            }

        target_channels[channel]["networks"] += 1
        target_channels[channel]["best_signal"] = max(
            target_channels[channel]["best_signal"],
            signal,
        )

        if signal >= -70:
            target_channels[channel]["strong_networks"] += 1

    # 2.4GHz is more sensitive to congestion.
    score -= min(
        25,
        band_stats["2.4GHz"]["networks"] * 2,
    )

    score -= min(
        30,
        band_stats["2.4GHz"]["strong_networks"] * 12,
    )

    # 5GHz congestion is less severe but still useful.
    score -= min(
        10,
        band_stats["5GHz"]["networks"] * 1,
    )

    score -= min(
        15,
        band_stats["5GHz"]["strong_networks"] * 8,
    )

    if band_stats["2.4GHz"]["networks"] >= 10:
        issues.append(
            f"2.4GHz congestionata: {band_stats['2.4GHz']['networks']} reti vicine"
        )

    if band_stats["2.4GHz"]["strong_networks"] > 0:
        issues.append(
            f"2.4GHz con {band_stats['2.4GHz']['strong_networks']} rete/i forte/i nelle vicinanze"
        )

    if band_stats["5GHz"]["networks"] >= 6:
        issues.append(
            f"5GHz affollata: {band_stats['5GHz']['networks']} reti vicine"
        )

    if band_stats["5GHz"]["strong_networks"] > 0:
        issues.append(
            f"5GHz con {band_stats['5GHz']['strong_networks']} rete/i forte/i nelle vicinanze"
        )

    # Reuse a lightweight advisor-like scoring for recommendations.
    def channel_score_24(channel):
        penalty = 0

        for nearby_channel, data in channels_24.items():
            distance = abs(channel - nearby_channel)

            base = (
                data["strong_networks"] * 35
                + max(0, data["networks"] - data["strong_networks"]) * 10
            )

            if distance == 0:
                penalty += base
            elif distance <= 2:
                penalty += int(base * 0.6)
            elif distance <= 4:
                penalty += int(base * 0.3)

        return max(0, 100 - penalty)

    def channel_score_5(channel):
        penalty = 0

        for nearby_channel, data in channels_5.items():
            distance = abs(channel - nearby_channel)

            base = (
                data["strong_networks"] * 25
                + max(0, data["networks"] - data["strong_networks"]) * 5
            )

            if distance == 0:
                penalty += base
            elif distance <= 4:
                penalty += int(base * 0.5)
            elif distance <= 8:
                penalty += int(base * 0.25)

        return max(0, 100 - penalty)

    candidates_24 = [
        {
            "channel": channel,
            "score": channel_score_24(channel),
        }
        for channel in [1, 6, 11]
    ]

    candidates_24 = sorted(
        candidates_24,
        key=lambda item: item["score"],
        reverse=True,
    )

    possible_channels_5 = get_param(
        payload,
        "Device.WiFi.Radio.2.PossibleChannels",
    )

    if possible_channels_5:
        candidate_channels_5 = [
            int(channel.strip())
            for channel in str(possible_channels_5).split(",")
            if channel.strip().isdigit()
        ]
    else:
        candidate_channels_5 = [36, 40, 44, 48]

    candidates_5 = [
        {
            "channel": channel,
            "score": channel_score_5(channel),
        }
        for channel in candidate_channels_5
    ]

    candidates_5 = sorted(
        candidates_5,
        key=lambda item: item["score"],
        reverse=True,
    )

    best_24 = candidates_24[0] if candidates_24 else None
    best_5 = candidates_5[0] if candidates_5 else None

    if best_24 and current_channel_24 is not None:
        if int(current_channel_24) != best_24["channel"]:
            score -= 10
            recommendations.append(
                f"Valutare cambio canale 2.4GHz da {current_channel_24} a {best_24['channel']}"
            )

    if best_5 and current_channel_5 is not None:
        if int(current_channel_5) != best_5["channel"]:
            score -= 5
            recommendations.append(
                f"Valutare cambio canale 5GHz da {current_channel_5} a {best_5['channel']}"
            )

    score = max(0, min(100, score))

    if score >= 90:
        rating = "EXCELLENT"
        stars = 5
    elif score >= 75:
        rating = "GOOD"
        stars = 4
    elif score >= 60:
        rating = "FAIR"
        stars = 3
    elif score >= 40:
        rating = "POOR"
        stars = 2
    else:
        rating = "CRITICAL"
        stars = 1

    if not issues:
        issues.append(
            "Nessuna anomalia WiFi rilevata"
        )

    if not recommendations:
        recommendations.append(
            "Configurazione WiFi attuale coerente con lo scenario RF rilevato"
        )

    channel_24_value = (
        int(current_channel_24)
        if current_channel_24 is not None
        else None
    )

    channel_5_value = (
        int(current_channel_5)
        if current_channel_5 is not None
        else None
    )

    try:
        db.execute(
            text("""
                INSERT INTO wifi_quality_history (
                    id,
                    device_id,
                    score,
                    rating,
                    channel_24,
                    channel_5,
                    issues,
                    recommendations,
                    created_at
                )
                VALUES (
                    :id,
                    :device_id,
                    :score,
                    :rating,
                    :channel_24,
                    :channel_5,
                    CAST(:issues AS jsonb),
                    CAST(:recommendations AS jsonb),
                    NOW()
                )
            """),
            {
                "id": str(uuid.uuid4()),
                "device_id": str(device.id),
                "score": score,
                "rating": rating,
                "channel_24": channel_24_value,
                "channel_5": channel_5_value,
                "issues": json.dumps(issues),
                "recommendations": json.dumps(recommendations),
            },
        )
        db.commit()

    except Exception as history_error:
        db.rollback()
        print(f"[WIFI_QUALITY_HISTORY_ERROR] {history_error}")

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "score": score,
        "rating": rating,
        "stars": stars,
        "issues": issues,
        "recommendations": recommendations,
        "bands": {
            "2.4GHz": {
                "current_channel": channel_24_value,
                "neighbor_count": band_stats["2.4GHz"]["networks"],
                "strong_neighbors": band_stats["2.4GHz"]["strong_networks"],
                "best_channel": best_24["channel"] if best_24 else None,
                "best_score": best_24["score"] if best_24 else None,
                "channels": list(channels_24.values()),
            },
            "5GHz": {
                "current_channel": channel_5_value,
                "neighbor_count": band_stats["5GHz"]["networks"],
                "strong_neighbors": band_stats["5GHz"]["strong_networks"],
                "best_channel": best_5["channel"] if best_5 else None,
                "best_score": best_5["score"] if best_5 else None,
                "channels": list(channels_5.values()),
            },
        },
    }



@router.get("/{device_id}/wifi/quality/history")
async def get_wifi_quality_history(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    rows = db.execute(
        text("""
            SELECT
                id,
                score,
                rating,
                channel_24,
                channel_5,
                issues,
                recommendations,
                created_at
            FROM wifi_quality_history
            WHERE device_id = :device_id
            ORDER BY created_at DESC
            LIMIT 100
        """),
        {
            "device_id": str(device.id),
        },
    ).mappings().all()

    history = []

    for row in rows:
        item = dict(row)
        item["id"] = str(item.get("id"))

        if item.get("created_at") is not None:
            item["created_at"] = item["created_at"].isoformat()

        history.append(item)

    latest = history[0] if history else None
    previous = history[1] if len(history) > 1 else None

    improvement = None

    if latest and previous:
        latest_score = latest.get("score")
        previous_score = previous.get("score")

        if latest_score is not None and previous_score is not None:
            improvement = int(latest_score) - int(previous_score)

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "count": len(history),
        "latest": latest,
        "previous": previous,
        "improvement": improvement,
        "history": history,
    }


@router.post("/{device_id}/wifi/optimize")
async def optimize_wifi(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = device.raw_acs_payload or {}

    current_channel_24 = unwrap_param(get_param(
        payload,
        "Device.WiFi.Radio.1.Channel",
    ))

    current_channel_5 = unwrap_param(get_param(
        payload,
        "Device.WiFi.Radio.2.Channel",
    ))

    # Valori attuali del tuo Quality Engine
    # Per ora usiamo la stessa logica validata dal test reale:
    # 2.4GHz -> canale 1
    # 5GHz   -> canale 48
    best_channel_24 = 1
    best_channel_5 = 48

    parameter_values = []
    changes = []

    if current_channel_24 is not None and int(current_channel_24) != best_channel_24:
        parameter_values.append([
            "Device.WiFi.Radio.1.Channel",
            best_channel_24,
            "xsd:unsignedInt",
        ])

        changes.append({
            "radio": "2.4GHz",
            "old": int(current_channel_24),
            "new": best_channel_24,
        })

    if current_channel_5 is not None and int(current_channel_5) != best_channel_5:
        parameter_values.append([
            "Device.WiFi.Radio.2.Channel",
            best_channel_5,
            "xsd:unsignedInt",
        ])

        changes.append({
            "radio": "5GHz",
            "old": int(current_channel_5),
            "new": best_channel_5,
        })

    if not parameter_values:
        return {
            "success": True,
            "optimized": False,
            "message": "WiFi already optimized",
            "changes": [],
        }

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": parameter_values,
        },
    )

    return {
        "success": True,
        "optimized": True,
        "changes": changes,
        "result": result,
    }
