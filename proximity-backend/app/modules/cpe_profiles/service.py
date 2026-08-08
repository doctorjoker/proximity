from typing import Any, Dict

from app.services.genieacs import GenieACSClient

from .analyzer import analyze_device


class QualificationError(RuntimeError):
    pass


async def fetch_device(acs_device_id: str) -> Dict[str, Any]:
    client = GenieACSClient()

    device = await client.get_device_raw(acs_device_id)

    if not device:
        raise QualificationError(
            f"ACS device non trovato: {acs_device_id}"
        )

    return device


async def qualify(
    acs_device_id: str,
    profile_code: str | None = None,
) -> Dict[str, Any]:

    device = await fetch_device(acs_device_id)

    return analyze_device(
        device,
        profile_code,
    )
