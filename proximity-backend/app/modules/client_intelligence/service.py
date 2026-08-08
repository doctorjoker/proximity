from __future__ import annotations

import asyncio
import re
from typing import Any
from urllib.parse import quote

import httpx


PARAMETER_PATHS = [
    "Device.Hosts.",
    "Device.WiFi.Radio.",
    "Device.WiFi.SSID.",
    "Device.WiFi.AccessPoint.",
]


def unwrap(value: Any, default: Any = None) -> Any:
    if isinstance(value, dict) and "_value" in value:
        return value.get("_value", default)
    return default if value is None else value


def numbered_children(node: Any) -> list[tuple[str, dict[str, Any]]]:
    if not isinstance(node, dict):
        return []
    return [
        (key, value)
        for key, value in node.items()
        if re.fullmatch(r"\d+", str(key)) and isinstance(value, dict)
    ]


def normalize_mac(value: Any) -> str | None:
    raw = str(unwrap(value, "") or "").strip().upper().replace("-", ":")
    if not raw:
        return None
    compact = re.sub(r"[^0-9A-F]", "", raw)
    if len(compact) != 12:
        return raw
    return ":".join(compact[i : i + 2] for i in range(0, 12, 2))


def infer_band(operating_band: Any, channel: Any = None) -> str | None:
    text = str(unwrap(operating_band, "") or "").lower()
    if "2.4" in text or "2g" in text:
        return "2.4 GHz"
    if "5" in text:
        return "5 GHz"
    try:
        ch = int(unwrap(channel, 0) or 0)
        if 1 <= ch <= 14:
            return "2.4 GHz"
        if ch > 14:
            return "5 GHz"
    except (TypeError, ValueError):
        pass
    return None


class ClientIntelligenceService:
    def __init__(self, nbi_url: str, timeout_seconds: float = 20.0):
        self.nbi_url = nbi_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def _get_device(self, acs_device_id: str) -> dict[str, Any] | None:
        query = quote('{"_id":"' + acs_device_id.replace('"', '\\"') + '"}')
        url = f"{self.nbi_url}/devices?query={query}"
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload = response.json()
        return payload[0] if payload else None

    async def _refresh(self, acs_device_id: str) -> dict[str, Any]:
        url = f"{self.nbi_url}/devices/{quote(acs_device_id, safe='')}/tasks?connection_request"
        body = {"name": "refreshObject", "objectName": "Device."}
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, json=body)
            if response.status_code >= 400:
                return {"requested": False, "status_code": response.status_code, "detail": response.text[:300]}
            return {"requested": True, "status_code": response.status_code}

    def parse(self, device: dict[str, Any]) -> dict[str, Any]:
        root = device.get("Device", {}) if isinstance(device, dict) else {}
        wifi = root.get("WiFi", {}) if isinstance(root, dict) else {}
        hosts_root = root.get("Hosts", {}) if isinstance(root, dict) else {}

        ssids: dict[str, dict[str, Any]] = {}
        for idx, item in numbered_children(wifi.get("SSID", {})):
            ssids[f"Device.WiFi.SSID.{idx}."] = {
                "ssid": unwrap(item.get("SSID")),
                "name": unwrap(item.get("Name")),
                "lower_layers": unwrap(item.get("LowerLayers")),
                "status": unwrap(item.get("Status")),
            }

        radios: dict[str, dict[str, Any]] = {}
        for idx, item in numbered_children(wifi.get("Radio", {})):
            path = f"Device.WiFi.Radio.{idx}."
            radios[path] = {
                "band": infer_band(item.get("OperatingFrequencyBand"), item.get("Channel")),
                "channel": unwrap(item.get("Channel")),
                "status": unwrap(item.get("Status")),
            }

        by_mac: dict[str, dict[str, Any]] = {}
        source_counts = {"hosts": 0, "associated_devices": 0}

        for host_id, host in numbered_children(hosts_root.get("Host", {})):
            mac = normalize_mac(host.get("PhysAddress") or host.get("MACAddress"))
            if not mac:
                continue
            source_counts["hosts"] += 1
            by_mac[mac] = {
                "mac": mac,
                "hostname": unwrap(host.get("HostName")) or None,
                "ip_address": unwrap(host.get("IPAddress")) or None,
                "active": bool(unwrap(host.get("Active"), False)),
                "interface_type": unwrap(host.get("InterfaceType")) or None,
                "layer1_interface": unwrap(host.get("Layer1Interface")) or None,
                "layer3_interface": unwrap(host.get("Layer3Interface")) or None,
                "address_source": unwrap(host.get("AddressSource")) or None,
                "lease_time_remaining": unwrap(host.get("LeaseTimeRemaining")),
                "radio_band": None,
                "ssid": None,
                "signal_strength": None,
                "snr": None,
                "last_data_downlink_rate": None,
                "last_data_uplink_rate": None,
                "sources": ["Device.Hosts.Host"],
                "host_instance": host_id,
            }

        for ap_id, ap in numbered_children(wifi.get("AccessPoint", {})):
            ssid_ref = unwrap(ap.get("SSIDReference"))
            ssid_info = ssids.get(str(ssid_ref), {})
            lower_layers = ssid_info.get("lower_layers")
            radio_info = radios.get(str(lower_layers), {})
            associated = ap.get("AssociatedDevice", {})
            for assoc_id, assoc in numbered_children(associated):
                mac = normalize_mac(assoc.get("MACAddress"))
                if not mac:
                    continue
                source_counts["associated_devices"] += 1
                current = by_mac.setdefault(
                    mac,
                    {
                        "mac": mac,
                        "hostname": None,
                        "ip_address": None,
                        "active": True,
                        "interface_type": "WiFi",
                        "layer1_interface": None,
                        "layer3_interface": None,
                        "address_source": None,
                        "lease_time_remaining": None,
                        "sources": [],
                    },
                )
                current.update(
                    {
                        "active": bool(unwrap(assoc.get("AuthenticationState"), True)),
                        "interface_type": "WiFi",
                        "radio_band": radio_info.get("band"),
                        "ssid": ssid_info.get("ssid"),
                        "signal_strength": unwrap(assoc.get("SignalStrength")),
                        "snr": unwrap(assoc.get("SNR")),
                        "last_data_downlink_rate": unwrap(assoc.get("LastDataDownlinkRate")),
                        "last_data_uplink_rate": unwrap(assoc.get("LastDataUplinkRate")),
                        "access_point_instance": ap_id,
                        "associated_device_instance": assoc_id,
                    }
                )
                if "Device.WiFi.AccessPoint.AssociatedDevice" not in current["sources"]:
                    current["sources"].append("Device.WiFi.AccessPoint.AssociatedDevice")

        clients = sorted(by_mac.values(), key=lambda x: (not bool(x.get("active")), x.get("hostname") or x["mac"]))
        active_clients = [item for item in clients if item.get("active")]
        return {
            "acs_device_id": device.get("_id"),
            "last_inform": device.get("_lastInform"),
            "client_count": len(clients),
            "active_client_count": len(active_clients),
            "wifi_client_count": sum(1 for item in active_clients if item.get("interface_type") == "WiFi"),
            "ethernet_client_count": sum(1 for item in active_clients if item.get("interface_type") not in (None, "WiFi")),
            "band_24_count": sum(1 for item in active_clients if item.get("radio_band") == "2.4 GHz"),
            "band_5_count": sum(1 for item in active_clients if item.get("radio_band") == "5 GHz"),
            "source_counts": source_counts,
            "clients": clients,
        }

    async def inspect(self, acs_device_id: str, refresh: bool = False, settle_seconds: float = 4.0) -> dict[str, Any]:
        refresh_result = None
        if refresh:
            refresh_result = await self._refresh(acs_device_id)
            if refresh_result.get("requested") and settle_seconds > 0:
                await asyncio.sleep(min(settle_seconds, 15.0))
        device = await self._get_device(acs_device_id)
        if not device:
            return {"found": False, "acs_device_id": acs_device_id, "refresh": refresh_result}
        result = self.parse(device)
        result.update({"found": True, "refresh": refresh_result})
        if result["client_count"] == 0:
            result["diagnostic"] = {
                "code": "CPE_CLIENT_TABLE_EMPTY",
                "message": "Il CPE espone le tabelle client, ma nello snapshot ACS entrambe risultano vuote.",
                "hosts_reported": unwrap(device.get("Device", {}).get("Hosts", {}).get("HostNumberOfEntries"), 0),
                "recommended_action": "Eseguire refresh=true; se resta vuoto, qualificare un parametro vendor-specifico nel CPE Profile.",
            }
        return result
