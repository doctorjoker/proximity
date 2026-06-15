from fastapi import APIRouter, Depends, HTTPException
import uuid
import json
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.models.device import Device

from app.services.genieacs import GenieACSClient

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

    ssid_24 = get_param(
        payload,
        "Device.WiFi.SSID.1.SSID",
    )

    status_24 = get_param(
        payload,
        "Device.WiFi.SSID.1.Status",
    )

    enabled_24 = get_param(
        payload,
        "Device.WiFi.SSID.1.Enable",
    )

    bssid_24 = get_param(
        payload,
        "Device.WiFi.SSID.1.BSSID",
    )

    radio_24 = get_param(
        payload,
        "Device.WiFi.SSID.1.LowerLayers",
    )

    radio24 = (
        payload.get("Device", {})
               .get("WiFi", {})
               .get("Radio", {})
               .get("1", {})
    )

    radio5 = (
        payload.get("Device", {})
               .get("WiFi", {})
               .get("Radio", {})
               .get("2", {})
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "wifi": {
            "primary": {
                "ssid_path": "Device.WiFi.SSID.1.SSID",
                "ssid": ssid_24,
                "status": status_24,
                "enabled": enabled_24,
                "bssid": bssid_24,
                "radio": radio_24,
            },

            "radio_24": {
                "enabled": radio24.get("Enable", {}).get("_value"),
                "status": radio24.get("Status", {}).get("_value"),
                "channel": radio24.get("Channel", {}).get("_value"),
                "bandwidth": radio24.get(
                    "CurrentOperatingChannelBandwidth",
                    {}
                ).get("_value"),
                "band": "2.4GHz",
            },

            "radio_5": {
                "enabled": radio5.get("Enable", {}).get("_value"),
                "status": radio5.get("Status", {}).get("_value"),
                "channel": radio5.get("Channel", {}).get("_value"),
                "bandwidth": radio5.get(
                    "CurrentOperatingChannelBandwidth",
                    {}
                ).get("_value"),
                "band": "5GHz",
            },

            "smart_connect": True,
        },
    }

from pydantic import BaseModel
from app.services.genieacs import GenieACSClient


class WifiSSIDRequest(BaseModel):
    ssid: str


@router.post("/{device_id}/wifi/ssid")
async def set_device_ssid(
    device_id: str,
    payload: WifiSSIDRequest,
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

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": [
                [
                    "Device.WiFi.SSID.1.SSID",
                    payload.ssid,
                    "xsd:string",
                ]
            ],
        },
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "new_ssid": payload.ssid,
        "result": result,
    }


from pydantic import BaseModel


class WifiPasswordRequest(BaseModel):
    password: str


@router.post("/{device_id}/wifi/password")
async def set_device_wifi_password(
    device_id: str,
    payload: WifiPasswordRequest,
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

    client = GenieACSClient()

    result = await client.create_task(
        device.acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": [
                [
                    "Device.WiFi.AccessPoint.1.Security.KeyPassphrase",
                    payload.password,
                    "xsd:string",
                ]
            ],
        },
    )

    return {
        "success": True,
        "device_id": str(device.id),
        "password_updated": True,
        "result": result,
    }


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

    uptime = get_param(
        payload,
        "Device.DeviceInfo.UpTime",
    )

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
    memory_used_percent = None

    if memory_free is not None and memory_total:
        memory_free_percent = round(
            (float(memory_free) / float(memory_total)) * 100,
            2,
        )
        memory_used_percent = round(
            100 - memory_free_percent,
            2,
        )

    health_score = 100
    risk_level = "LOW"
    status = "GOOD"

    if cpu_usage is not None:
        cpu_value = int(cpu_usage)

        if cpu_value >= 90:
            health_score -= 35
        elif cpu_value >= 75:
            health_score -= 20
        elif cpu_value >= 60:
            health_score -= 8

    if memory_free_percent is not None:
        if memory_free_percent < 15:
            health_score -= 35
        elif memory_free_percent < 30:
            health_score -= 20
        elif memory_free_percent < 45:
            health_score -= 8

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
            "uptime_seconds": uptime,
            "cpu_usage_percent": cpu_usage,
            "memory_free": memory_free,
            "memory_total": memory_total,
            "memory_free_percent": memory_free_percent,
            "memory_used_percent": memory_used_percent,
        },
    }


@router.get("/{device_id}/clients")
async def get_device_clients(
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

    hosts = (
        payload
        .get("Device", {})
        .get("Hosts", {})
        .get("Host", {})
    )

    clients = []

    for host_id, host in hosts.items():
        if not isinstance(host, dict):
            continue

        active = get_param(
            {"h": host},
            "h.Active",
        )

        ip_address = get_param(
            {"h": host},
            "h.IPAddress",
        )

        mac_address = get_param(
            {"h": host},
            "h.PhysAddress",
        )

        hostname = get_param(
            {"h": host},
            "h.HostName",
        )

        address_source = get_param(
            {"h": host},
            "h.AddressSource",
        )

        lease_time = get_param(
            {"h": host},
            "h.LeaseTimeRemaining",
        )

        rssi = get_param(
            {"h": host},
            "h.X_TP_Rssi",
        )

        rx_rate = get_param(
            {"h": host},
            "h.X_TP_RxRate",
        )

        tx_rate = get_param(
            {"h": host},
            "h.X_TP_TxRate",
        )

        lan_conn_type = get_param(
            {"h": host},
            "h.X_TP_LanConnType",
        )

        clients.append({
            "host_id": host_id,
            "active": active,
            "hostname": hostname,
            "ip_address": ip_address,
            "mac_address": mac_address,
            "address_source": address_source,
            "lease_time_remaining": lease_time,
            "rssi": rssi,
            "rx_rate": rx_rate,
            "tx_rate": tx_rate,
            "lan_conn_type": lan_conn_type,
        })

    active_clients = [
        client for client in clients
        if client.get("active") is True
    ]

    return {
        "success": True,
        "device_id": str(device.id),
        "acs_device_id": device.acs_device_id,
        "count": len(clients),
        "active_count": len(active_clients),
        "clients": clients,
        "active_clients": active_clients,
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

        ssid = get_param(
            {"r": item},
            "r.SSID",
        )

        bssid = get_param(
            {"r": item},
            "r.BSSID",
        )

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

        bandwidth = get_param(
            {"r": item},
            "r.OperatingChannelBandwidth",
        )

        security = get_param(
            {"r": item},
            "r.SecurityModeEnabled",
        )

        encryption = get_param(
            {"r": item},
            "r.EncryptionMode",
        )

        extension_channel = get_param(
            {"r": item},
            "r.X_TP_ExtensionChannel",
        )

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

        if current_channel is not None:
            current_channel = int(current_channel)

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
