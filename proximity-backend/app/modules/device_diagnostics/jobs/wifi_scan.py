from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.cpe_profiles import resolve_profile
from app.modules.cpe_profiles.resolver import CPEProfileNotFoundError
from app.services.genieacs import GenieACSClient


def _unwrap(value: Any) -> Any:
    if isinstance(value, dict) and "_value" in value:
        return value.get("_value")
    return value


def _get_path(root: dict[str, Any], path: str | None) -> Any:
    if not path:
        return None
    current: Any = root
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return _unwrap(current)


def _get_object(root: dict[str, Any], path: str | None) -> dict[str, Any]:
    if not path:
        return {}
    current: Any = root
    for part in path.split("."):
        if not isinstance(current, dict):
            return {}
        current = current.get(part)
    return current if isinstance(current, dict) else {}


def _numeric_items(value: Any) -> list[tuple[str, dict[str, Any]]]:
    if not isinstance(value, dict):
        return []
    return [
        (str(key), item)
        for key, item in value.items()
        if str(key).isdigit() and isinstance(item, dict)
    ]


def _first(item: dict[str, Any], *names: str) -> Any:
    for name in names:
        value = _unwrap(item.get(name))
        if value not in (None, ""):
            return value
    return None


def _neighbor(item: dict[str, Any], *, source: str, path: str, band: str) -> dict[str, Any]:
    return {
        "source": source,
        "path": path,
        "ssid": _first(item, "SSID", "NetworkName", "BSSIDName"),
        "bssid": _first(item, "BSSID", "MACAddress"),
        "channel": _first(item, "Channel"),
        "signal_strength": _first(item, "SignalStrength", "RSSI", "SignalLevel"),
        "noise": _first(item, "Noise"),
        "band": _first(item, "OperatingFrequencyBand", "Band") or band,
        "security_mode": _first(item, "SecurityModeEnabled", "BeaconType", "SecurityMode"),
        "encryption": _first(item, "EncryptionMode", "Encryption"),
    }


def _device_identity(device_id: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        row = db.execute(
            text(
                """
                SELECT id, acs_device_id, manufacturer, model, product_class
                FROM devices
                WHERE id = :id
                """
            ),
            {"id": device_id},
        ).mappings().first()
        if not row:
            raise RuntimeError("Device not found")
        if not row.get("acs_device_id"):
            raise RuntimeError("Device has no ACS device id")
        return dict(row)
    finally:
        db.close()


def _resolve_profile(identity: dict[str, Any]):
    vendor = identity.get("manufacturer")
    product_class = identity.get("product_class") or identity.get("model")
    try:
        return resolve_profile(vendor, product_class, required=True)
    except CPEProfileNotFoundError as exc:
        raise RuntimeError(
            "No qualified CPE profile is available for WiFi neighbor scan: "
            f"vendor={vendor!r}, product_class={product_class!r}"
        ) from exc


def _band_definitions(profile: Any) -> list[tuple[str, Any]]:
    return [("2.4GHz", profile.wifi24), ("5GHz", profile.wifi5)]


def _collect_profile_neighbors(payload: dict[str, Any], profile: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    neighbors: list[dict[str, Any]] = []
    bands: list[dict[str, Any]] = []

    for band, band_profile in _band_definitions(profile):
        trigger_path = band_profile.neighbor_scan_trigger
        results_path = band_profile.neighbor_scan_results
        result_root = _get_object(payload, results_path)
        rows = _numeric_items(result_root)
        state = _get_path(payload, trigger_path)

        bands.append(
            {
                "band": band,
                "trigger_path": trigger_path,
                "trigger_value": band_profile.neighbor_scan_trigger_value,
                "results_path": results_path,
                "scan_state": state,
                "result_count": len(rows),
            }
        )

        for index, item in rows:
            neighbors.append(
                _neighbor(
                    item,
                    source="CPE_PROFILE",
                    path=f"{results_path}.{index}",
                    band=band,
                )
            )

    deduplicated: dict[str, dict[str, Any]] = {}
    for item in neighbors:
        key = str(item.get("bssid") or f"{item.get('ssid')}:{item.get('channel')}:{item.get('path')}")
        deduplicated[key] = item
    return list(deduplicated.values()), bands


async def _submit_trigger(client: GenieACSClient, acs_device_id: str, band: str, band_profile: Any) -> dict[str, Any]:
    if not band_profile.neighbor_scan_trigger or not band_profile.neighbor_scan_trigger_value:
        return {"band": band, "supported": False, "reason": "PROFILE_MAPPING_MISSING"}

    task = await client.create_task(
        acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": [
                [
                    band_profile.neighbor_scan_trigger,
                    band_profile.neighbor_scan_trigger_value,
                    "xsd:string",
                ]
            ],
        },
    )
    return {
        "band": band,
        "supported": True,
        "trigger_path": band_profile.neighbor_scan_trigger,
        "trigger_value": band_profile.neighbor_scan_trigger_value,
        "task": task,
    }


async def _submit_refresh(client: GenieACSClient, acs_device_id: str, band: str, band_profile: Any) -> dict[str, Any]:
    if not band_profile.neighbor_scan_results:
        return {"band": band, "supported": False, "reason": "PROFILE_MAPPING_MISSING"}

    task = await client.create_task(
        acs_device_id,
        {
            "name": "refreshObject",
            "objectName": band_profile.neighbor_scan_results,
        },
    )
    return {
        "band": band,
        "supported": True,
        "results_path": band_profile.neighbor_scan_results,
        "task": task,
    }


async def wifi_scan(context: dict[str, Any]) -> dict[str, Any]:
    """Run profile-driven WiFi neighbor scan on every qualified radio.

    For the TP-Link XC220-G3v the qualified sequence is:
      1. set X_TP_NeighbourScanEnabled to ``Requested`` on each band;
      2. refresh only the corresponding X_TP_BSSDescEntry object;
      3. poll the profile-mapped result objects.

    A successful execution with zero rows is reported neutrally as
    ``SCAN_COMPLETED_NO_RESULTS``. It does not claim that nearby networks do
    not exist or that the firmware lacks the feature.
    """
    identity = _device_identity(str(context["device_id"]))
    profile = _resolve_profile(identity)
    parameters = context.get("parameters") or {}
    timeout_seconds = max(15, min(int(context.get("timeout_seconds") or 45), 120))
    poll_seconds = max(2, min(int(parameters.get("poll_seconds") or 5), 15))
    trigger_wait_seconds = max(2, min(int(parameters.get("trigger_wait_seconds") or 8), 20))
    client = GenieACSClient()

    trigger_tasks: list[dict[str, Any]] = []
    for band, band_profile in _band_definitions(profile):
        trigger_tasks.append(await _submit_trigger(client, identity["acs_device_id"], band, band_profile))

    await asyncio.sleep(trigger_wait_seconds)

    refresh_tasks: list[dict[str, Any]] = []
    for band, band_profile in _band_definitions(profile):
        refresh_tasks.append(await _submit_refresh(client, identity["acs_device_id"], band, band_profile))

    started = asyncio.get_running_loop().time()
    attempts = 0
    neighbors: list[dict[str, Any]] = []
    bands: list[dict[str, Any]] = []

    while True:
        attempts += 1
        payload = await client.get_device_raw(identity["acs_device_id"])
        if isinstance(payload, dict):
            neighbors, bands = _collect_profile_neighbors(payload, profile)
        if neighbors:
            break
        elapsed = asyncio.get_running_loop().time() - started
        if elapsed >= timeout_seconds:
            break
        await asyncio.sleep(min(poll_seconds, max(0.1, timeout_seconds - elapsed)))

    elapsed = round(asyncio.get_running_loop().time() - started, 3)
    capability_status = "RESULTS_AVAILABLE" if neighbors else "SCAN_COMPLETED_NO_RESULTS"
    message = (
        f"Scansione completata: rilevate {len(neighbors)} reti vicine."
        if neighbors
        else "Scansione eseguita su entrambe le bande, ma il CPE non ha restituito reti vicine tramite ACS."
    )

    return {
        "diagnostic_type": "WIFI_SCAN",
        "device_id": str(identity["id"]),
        "acs_device_id": identity["acs_device_id"],
        "manufacturer": identity.get("manufacturer"),
        "model": identity.get("model") or identity.get("product_class"),
        "profile": {
            "vendor": profile.vendor,
            "product_class": profile.product_class,
            "data_model": profile.data_model,
        },
        "capability_status": capability_status,
        "neighbor_count": len(neighbors),
        "neighbors": neighbors,
        "bands": bands,
        "tasks": {
            "triggers": trigger_tasks,
            "refreshes": refresh_tasks,
        },
        "polling": {
            "attempts": attempts,
            "poll_seconds": poll_seconds,
            "trigger_wait_seconds": trigger_wait_seconds,
            "timeout_seconds": timeout_seconds,
            "elapsed_seconds": elapsed,
        },
        "message": message,
    }
