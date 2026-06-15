from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.device import Device
from app.services.genieacs import GenieACSClient
from app.device_profiles.resolver import (
    read_capability,
    resolve_device_profile,
)

router = APIRouter(
    prefix="/api/v1/devices",
    tags=["Device VoIP"],
)


class VoIPAccountRequest(BaseModel):
    username: str
    password: str | None = None
    directory_number: str | None = None
    registrar: str = "ippbx.speednetwifi.it"
    proxy: str | None = None
    port: int = 5160
    enable: bool = True


def first_profile_path(profile: dict, key: str, fallback: str):
    paths = profile.get("paths", {}).get(key, [])

    if paths:
        return paths[0]

    return fallback


@router.get("/{device_id}/voip")
async def get_device_voip(
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
    profile = resolve_device_profile(device)

    fields = [
        "voip_sip_username",
        "voip_sip_password",
        "voip_directory_number",
        "voip_line_enable",
        "voip_line_status",
        "voip_proxy_server",
        "voip_registrar_server",
        "voip_registrar_port",
    ]

    values = {
        field: read_capability(device, payload, field)
        for field in fields
    }

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "profile": profile.get("profile_code"),
        "voip": {
            "enabled": values["voip_line_enable"]["value"],
            "status": values["voip_line_status"]["value"],
            "directory_number": values["voip_directory_number"]["value"],
            "sip_username": values["voip_sip_username"]["value"],
            "sip_password_set": bool(
                values["voip_sip_password"]["value"]
            ),
            "proxy_server": values["voip_proxy_server"]["value"],
            "registrar_server": values["voip_registrar_server"]["value"],
            "registrar_port": values["voip_registrar_port"]["value"],
        },
        "raw_paths": values,
    }



@router.post("/{device_id}/voip/account")
async def set_device_voip_account(
    device_id: str,
    payload: VoIPAccountRequest,
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

    profile = resolve_device_profile(device)
    proxy = payload.proxy or payload.registrar
    directory_number = payload.directory_number or payload.username

    username_path = first_profile_path(
        profile,
        "voip_sip_username",
        "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthUserName",
    )

    password_path = first_profile_path(
        profile,
        "voip_sip_password",
        "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthPassword",
    )

    directory_number_path = first_profile_path(
        profile,
        "voip_directory_number",
        "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.DirectoryNumber",
    )

    proxy_path = first_profile_path(
        profile,
        "voip_proxy_server",
        "Device.Services.VoiceService.1.VoiceProfile.1.SIP.ProxyServer",
    )

    registrar_path = first_profile_path(
        profile,
        "voip_registrar_server",
        "Device.Services.VoiceService.1.VoiceProfile.1.SIP.RegistrarServer",
    )

    registrar_port_path = first_profile_path(
        profile,
        "voip_registrar_port",
        "Device.Services.VoiceService.1.VoiceProfile.1.SIP.RegistrarServerPort",
    )

    parameter_values = [
        [
            username_path,
            payload.username,
            "xsd:string",
        ],
        [
            directory_number_path,
            directory_number,
            "xsd:string",
        ],
        [
            proxy_path,
            proxy,
            "xsd:string",
        ],
        [
            registrar_path,
            payload.registrar,
            "xsd:string",
        ],
        [
            registrar_port_path,
            int(payload.port),
            "xsd:unsignedInt",
        ],
    ]

    if payload.password:
        parameter_values.append(
            [
                password_path,
                payload.password,
                "xsd:string",
            ]
        )

    profile_paths = profile.get("paths", {})

    for path in [
        path
        for path in profile_paths.get("voip_sip_username", [])[1:]
        if "MultiIsp" in path
    ]:
        parameter_values.append([path, payload.username, "xsd:string"])

    for path in [
        path
        for path in profile_paths.get("voip_proxy_server", [])[1:]
        if "MultiIsp" in path
    ]:
        parameter_values.append([path, proxy, "xsd:string"])

    for path in [
        path
        for path in profile_paths.get("voip_registrar_server", [])[1:]
        if "MultiIsp" in path
    ]:
        parameter_values.append([path, payload.registrar, "xsd:string"])

    for path in [
        path
        for path in profile_paths.get("voip_registrar_port", [])[1:]
        if "MultiIsp" in path
    ]:
        parameter_values.append([path, int(payload.port), "xsd:unsignedInt"])

    if payload.password:
        for path in [
            path
            for path in profile_paths.get("voip_sip_password", [])[1:]
            if "MultiIsp" in path
        ]:
            parameter_values.append([path, payload.password, "xsd:string"])

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
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "profile": profile.get("profile_code"),
        "voip": {
            "username": payload.username,
            "directory_number": directory_number,
            "registrar": payload.registrar,
            "proxy": proxy,
            "port": payload.port,
            "password_updated": bool(payload.password),
        },
        "parameter_count": len(parameter_values),
        "parameter_values": parameter_values,
        "result": result,
    }
