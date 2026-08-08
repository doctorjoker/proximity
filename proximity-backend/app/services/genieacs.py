import asyncio
import hashlib
import json

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
        task_url = f"{self.base_url}/devices/{encoded_device_id}/tasks"
        query_params = {"connection_request": ""}

        print("=" * 80, flush=True)
        print("GENIEACS CREATE TASK", flush=True)
        print("DEVICE:", acs_device_id, flush=True)
        print("URL:", task_url, flush=True)
        print("QUERY:", query_params, flush=True)
        print("PAYLOAD:", flush=True)
        print(json.dumps(task, indent=2, default=str), flush=True)
        print("=" * 80, flush=True)

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                task_url,
                params=query_params,
                json=task,
            )

            print("=" * 80, flush=True)
            print("GENIEACS RESPONSE", flush=True)
            print("HTTP:", response.status_code, flush=True)
            print("HEADERS:", flush=True)
            print(json.dumps(dict(response.headers), indent=2, default=str), flush=True)
            print("BODY:", flush=True)
            print(response.text, flush=True)
            print("=" * 80, flush=True)

            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code

                if status_code == 404:
                    return {
                        "success": False,
                        "error": "DEVICE_NOT_FOUND_IN_ACS",
                        "acs_device_id": acs_device_id,
                        "status_code": status_code,
                    }

                return {
                    "success": False,
                    "error": "GENIEACS_TASK_FAILED",
                    "acs_device_id": acs_device_id,
                    "status_code": status_code,
                    "details": exc.response.text,
                }

            try:
                payload = response.json() if response.text else {}
            except ValueError:
                payload = {"raw": response.text}

            return payload if payload else {"success": True}

    @staticmethod
    def _subtree(payload: dict, object_name: str):
        current = payload
        for part in object_name.rstrip(".").split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
            if current is None:
                return None
        return current

    @classmethod
    def _object_fingerprint(cls, payload: dict, object_names: list[str]) -> str:
        selected = {
            object_name: cls._subtree(payload or {}, object_name)
            for object_name in object_names
        }
        serialized = json.dumps(
            selected,
            sort_keys=True,
            default=str,
            separators=(",", ":"),
        )
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def refresh_object(self, acs_device_id: str, object_name: str):
        return await self.create_task(
            acs_device_id,
            {
                "name": "refreshObject",
                "objectName": object_name.rstrip("."),
            },
        )

    async def refresh_objects(
        self,
        acs_device_id: str,
        object_names: list[str],
        wait_seconds: int = 20,
        poll_interval: int = 2,
    ):
        roots = list(dict.fromkeys(
            object_name.rstrip(".")
            for object_name in object_names
            if object_name
        ))
        if not roots:
            raise ValueError("At least one ACS object is required")

        bounded_wait = max(0, min(int(wait_seconds), 60))
        bounded_poll = max(1, min(int(poll_interval), 10))
        before_payload = await self.get_device_raw(acs_device_id)
        before_fingerprint = self._object_fingerprint(before_payload or {}, roots)

        tasks = []
        for object_name in roots:
            try:
                result = await self.refresh_object(acs_device_id, object_name)
                accepted = not (
                    isinstance(result, dict)
                    and result.get("success") is False
                )
                tasks.append({
                    "object_name": object_name,
                    "accepted": accepted,
                    "result": result,
                })
            except Exception as exc:  # noqa: BLE001
                tasks.append({
                    "object_name": object_name,
                    "accepted": False,
                    "error": str(exc),
                })

        if not any(item["accepted"] for item in tasks):
            return {
                "success": False,
                "status": "TASK_REJECTED",
                "changed": False,
                "timed_out": False,
                "poll_attempts": 0,
                "object_names": roots,
                "tasks": tasks,
                "payload": before_payload,
            }

        if bounded_wait == 0:
            return {
                "success": True,
                "status": "TASK_CREATED",
                "changed": False,
                "timed_out": False,
                "poll_attempts": 0,
                "object_names": roots,
                "tasks": tasks,
                "payload": before_payload,
            }

        loop = asyncio.get_running_loop()
        started = loop.time()
        latest_payload = before_payload
        attempts = 0
        changed = False

        while loop.time() - started < bounded_wait:
            attempts += 1
            await asyncio.sleep(bounded_poll)
            latest_payload = await self.get_device_raw(acs_device_id)
            latest_fingerprint = self._object_fingerprint(
                latest_payload or {},
                roots,
            )
            if latest_fingerprint != before_fingerprint:
                changed = True
                break

        return {
            "success": True,
            "status": "UPDATED" if changed else "TIMEOUT",
            "changed": changed,
            "timed_out": not changed,
            "poll_attempts": attempts,
            "wait_seconds": bounded_wait,
            "object_names": roots,
            "tasks": tasks,
            "payload": latest_payload,
        }

    async def refresh_wifi(
        self,
        acs_device_id: str,
        wait_seconds: int = 20,
    ):
        return await self.refresh_objects(
            acs_device_id=acs_device_id,
            object_names=[
                "Device.WiFi.Radio",
                "Device.WiFi.SSID",
                "Device.WiFi.AccessPoint",
            ],
            wait_seconds=wait_seconds,
        )

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

    async def set_wifi_credentials(
        self,
        acs_device_id: str,
        parameter_values: list[list[object]],
    ):
        """Apply profile-resolved WiFi credentials without vendor-specific paths."""
        if not parameter_values:
            raise ValueError("At least one WiFi parameter value is required")
        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": parameter_values,
            },
        )

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

    async def set_tplink_voip_credentials(
        self,
        acs_device_id: str,
        number: str,
        username: str,
        password: str,
        registrar: str,
        registrar_port: int = 5160,
        isp_name: str = "Other provider",
    ):
        return await self.create_task(
            acs_device_id,
            {
                "name": "setParameterValues",
                "parameterValues": [
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAccountEnable", 1, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiIspName", isp_name, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiProfileName", number, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAuthUserName", username, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAuthPassword", password, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiDisplayName", number, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiExtension", number, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiVoipNum", number, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiDomain", "", "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiRegistrarServer", registrar, "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiRegistrarServerPort", registrar_port, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiProxyServer", "0.0.0.0", "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiProxyServerPort", 5060, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiOutboundProxy", "0.0.0.0", "xsd:string"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiOutboundProxyPort", 5060, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiUserAgentPort", registrar_port, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiRegisterViaOB", 0, "xsd:int"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAccountInRoute", 0, "xsd:unsignedInt"],
                    ["Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAccountPrior", 1, "xsd:unsignedInt"],
                ],
            },
        )

genieacs_client = GenieACSClient()
