import asyncio

from app.services.genieacs import genieacs_client


async def wait_router_available(
    acs_device_id: str,
    timeout: int = 120,
    interval: int = 5,
):
    elapsed = 0

    while elapsed < timeout:

        device = await genieacs_client.get_device_raw(
            acs_device_id
        )

        if device:
            return {
                "success": True,
                "state": "ONLINE",
                "acs_device_id": acs_device_id,
                "elapsed_seconds": elapsed,
            }

        await asyncio.sleep(interval)

        elapsed += interval

    return {
        "success": False,
        "state": "TIMEOUT",
        "acs_device_id": acs_device_id,
        "elapsed_seconds": elapsed,
    }
