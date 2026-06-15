import httpx
from urllib.parse import quote

from app.core.config import settings


class GenieACSClient:
    def __init__(self, base_url: str = None):
        self.base_url = (base_url or settings.genieacs_nbi_url).rstrip("/")

    async def get_devices(self):
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{self.base_url}/devices")
            response.raise_for_status()
            return response.json()

    async def create_task(self, acs_device_id: str, task: dict):
        encoded_device_id = quote(acs_device_id, safe="")

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/devices/{encoded_device_id}/tasks",
                json=task,
            )
            response.raise_for_status()
            return response.json() if response.text else {"success": True}

    async def wifi_scan(self, acs_device_id: str):
        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": [
                    [
                        "Device.WiFi.NeighboringWiFiDiagnostic.DiagnosticsState",
                        "Requested",
                        "xsd:string",
                    ]
                ],
            },
        )

    async def get_device_raw(self, acs_device_id: str):
        encoded_device_id = quote(acs_device_id, safe="")

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(
                f"{self.base_url}/devices",
                params={
                    "query": f'{{"_id":"{acs_device_id}"}}'
                },
            )

            response.raise_for_status()

            data = response.json()

            if not data:
                return None

            return data[0]


genieacs_client = GenieACSClient()
