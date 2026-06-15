from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from sqlalchemy import text

from app.db.session import get_db
from app.repositories.device_query_repository import (
    get_devices,
    get_device,
    get_device_parameters,
    get_device_parameters_map,
)

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Devices"],
)


@router.get("")
async def list_devices(db: Session = Depends(get_db)):
    devices = get_devices(db)

    return {
        "success": True,
        "count": len(devices),
        "items": [
            {
                "id": str(d.id),
                "device_code": d.device_code,
                "serial_number": d.serial_number,
                "manufacturer": d.manufacturer,
                "model": d.model,
                "software_version": d.software_version,
                "status": d.status,
                "online": d.online,
                "last_seen": d.last_seen,
            }
            for d in devices
        ],
    }


@router.get("/{device_id}")
async def device_detail(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = get_device(db, device_id)

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    return {
        "success": True,
        "item": {
            "id": str(device.id),
            "device_code": device.device_code,
            "acs_device_id": device.acs_device_id,
            "serial_number": device.serial_number,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "product_class": device.product_class,
            "software_version": device.software_version,
            "hardware_version": device.hardware_version,
            "status": device.status,
            "online": device.online,
            "first_seen": device.first_seen,
            "last_seen": device.last_seen,
            "acs_last_inform": device.acs_last_inform,
        },
    }


@router.get("/{device_id}/access-url")
async def device_access_url(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = get_device(db, device_id)

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    row = db.execute(
        text("""
            SELECT
                d.id,
                d.manufacturer,
                d.model,
                d.wan_ip,
                p.access_template
            FROM devices d
            LEFT JOIN device_access_profiles p
                ON p.vendor = d.manufacturer
               AND p.model = d.model
            WHERE d.id = :device_id
        """),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    if not row["wan_ip"]:
        return {
            "success": False,
            "reason": "WAN_IP_NOT_AVAILABLE",
        }

    template = row["access_template"]

    if not template:
        return {
            "success": False,
            "reason": "ACCESS_PROFILE_NOT_FOUND",
            "manufacturer": row["manufacturer"],
            "model": row["model"],
        }

    access_url = template.replace(
        "{wan_ip}",
        row["wan_ip"],
    )

    return {
        "success": True,
        "device_id": device_id,
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "wan_ip": row["wan_ip"],
        "template": template,
        "access_url": access_url,
    }

@router.get("/{device_id}/acs-summary")
async def device_acs_summary(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = get_device(db, device_id)

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    row = db.execute(
        text("""
            SELECT
                id,
                acs_device_id,
                manufacturer,
                model,
                software_version,
                hardware_version,
                wan_ip,
                pppoe_username,
                last_seen,
                raw_acs_payload
            FROM devices
            WHERE id = :device_id
        """),
        {"device_id": device_id},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    payload = row.get("raw_acs_payload") or {}

    uptime = None

    try:
        uptime = (
            payload.get("Device", {})
                   .get("DeviceInfo", {})
                   .get("UpTime", {})
                   .get("_value")
        )
    except Exception:
        uptime = None

    wifi = {
        "ssids": [],
        "radio24": [],
        "radio5": [],
    }

    try:
        ssids = (
            payload.get("Device", {})
                   .get("WiFi", {})
                   .get("SSID", {})
        )

        for ssid_id, ssid_data in ssids.items():
            name = (
                ssid_data.get("SSID", {})
                         .get("_value")
            )

            enabled = (
                ssid_data.get("Enable", {})
                         .get("_value")
            )

            status = (
                ssid_data.get("Status", {})
                         .get("_value")
            )

            bssid = (
                ssid_data.get("BSSID", {})
                         .get("_value")
            )

            lower_layer = (
                ssid_data.get("LowerLayers", {})
                         .get("_value", "")
            )

            item = {
                "id": ssid_id,
                "ssid": name,
                "enabled": enabled,
                "status": status,
                "bssid": bssid,
                "lower_layer": lower_layer,
            }

            wifi["ssids"].append(item)

            if "Radio.1" in lower_layer:
                wifi["radio24"].append(item)
            elif "Radio.2" in lower_layer:
                wifi["radio5"].append(item)

    except Exception:
        pass

    return {
        "success": True,
        "device": {
            "manufacturer": row["manufacturer"],
            "model": row["model"],
            "firmware": row["software_version"],
            "hardware": row["hardware_version"],
        },
        "internet": {
            "pppoe_username": row["pppoe_username"],
            "wan_ip": row["wan_ip"],
            "uptime": uptime,
            "last_seen": row["last_seen"],
        },
        "wifi": wifi,
    }

@router.get("/{device_id}/parameters")
async def device_parameters(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = get_device(db, device_id)

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    parameters = get_device_parameters(db, device_id)

    return {
        "success": True,
        "device_id": device_id,
        "count": len(parameters),
        "items": [
            {
                "name": p.parameter_name,
                "value": p.parameter_value,
                "type": p.parameter_type,
                "last_refresh": p.last_refresh,
            }
            for p in parameters
        ],
    }


@router.get("/{device_id}/overview")
async def device_overview(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = get_device(db, device_id)

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    params = get_device_parameters_map(db, device_id)

    return {
        "success": True,
        "item": {
            "id": str(device.id),
            "device_code": device.device_code,
            "acs_device_id": device.acs_device_id,
            "serial_number": device.serial_number,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "product_class": device.product_class,
            "hardware_version": device.hardware_version,
            "software_version": device.software_version,
            "wan_ip": params.get("Device.IP.Interface.3.IPv4Address.1.IPAddress"),
            "lan_ip": params.get("Device.IP.Interface.1.IPv4Address.1.IPAddress"),
            "connection_request_url": params.get("Device.ManagementServer.ConnectionRequestURL"),
            "root_data_model_version": params.get("Device.RootDataModelVersion"),
            "status": device.status,
            "online": device.online,
            "first_seen": device.first_seen,
            "last_seen": device.last_seen,
            "acs_last_inform": device.acs_last_inform,
            "customer_code": device.customer_code,
            "customer_name": device.customer_name,
            "service_code": device.service_code,
            "service_order_code": device.service_order_code,
            "site_address": device.site_address,
        },
    }
