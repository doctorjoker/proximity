import httpx
from urllib.parse import quote

from app.core.config import settings


class GenieACSClient:
    def __init__(self, base_url: str = None):
        self.base_url = (base_url or settings.genieacs_nbi_url).rstrip("/")

    async def set_pppoe_credentials(self, acs_device_id: str, username: str, password: str):
        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": [
                    [
                        "Device.PPP.Interface.1.Username",
                        username,
                        "xsd:string",
                    ],
                    [
                        "Device.PPP.Interface.1.Password",
                        password,
                        "xsd:string",
                    ],
                ],
            },
        )


    async def set_tplink_wan_pppoe_credentials(
        self,
        acs_device_id: str,
        username: str,
        password: str,
        wan_device: str = "1",
        wan_connection_device: str = "4",
        wan_ppp_connection: str = "1",
    ):
        base = (
            f"InternetGatewayDevice.WANDevice.{wan_device}."
            f"WANConnectionDevice.{wan_connection_device}."
            f"WANPPPConnection.{wan_ppp_connection}"
        )

        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": [
                    [f"{base}.Username", username, "xsd:string"],
                    [f"{base}.Password", password, "xsd:string"],
                ],
            },
        )

    async def verify_pppoe_credentials(self, acs_device_id: str):
        device = await self.get_device_raw(acs_device_id)

        if not device:
            return None

        username = None

        try:
            username = (
                device["Device"]["PPP"]["Interface"]["1"]
                ["Username"]["_value"]
            )
        except Exception:
            pass

        return {
            "username": username
        }

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

    async def set_tplink_wifi_credentials(
        self,
        acs_device_id: str,
        ssid_24: str,
        password_24: str,
        ssid_5: str,
        password_5: str,
    ):
        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": [
                    ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", ssid_24, "xsd:string"],
                    ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", password_24, "xsd:string"],
                    ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.SSID", ssid_5, "xsd:string"],
                    ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.PreSharedKey.1.KeyPassphrase", password_5, "xsd:string"],
                ],
            },
        )


genieacs_client = GenieACSClient()
