from __future__ import annotations

import asyncio
from typing import Any

from app.db.session import SessionLocal
from app.models.device import Device
from app.services.genieacs import genieacs_client


TERMINAL_OK = {"COMPLETE", "COMPLETED"}
TERMINAL_ERROR_PREFIX = "ERROR"
ACTIVE_STATES = {"REQUESTED", "RUNNING", "IN_PROGRESS", "COLLECTING"}


def _identity(device_id: str) -> str:
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device or not getattr(device, "acs_device_id", None):
            raise RuntimeError("Device or ACS identity not found")
        return str(device.acs_device_id)
    finally:
        db.close()


def _node(payload: dict[str, Any], dotted_path: str) -> Any:
    current: Any = payload
    for part in dotted_path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _value(node: Any) -> Any:
    if isinstance(node, dict) and "_value" in node:
        return node.get("_value")
    return node


def _get(payload: dict[str, Any], dotted_path: str, default: Any = None) -> Any:
    value = _value(_node(payload, dotted_path))
    return default if value is None else value


def _to_int(value: Any) -> int | None:
    if value in (None, "", "N/D"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _normalize_state(value: Any) -> str:
    raw = str(value or "None").strip()
    mapping = {
        "None": "IDLE",
        "Requested": "REQUESTED",
        "Complete": "COMPLETED",
        "Completed": "COMPLETED",
    }
    if raw.startswith("Error"):
        return "ERROR"
    return mapping.get(raw, raw.upper())


def _select_root(device: dict[str, Any]) -> str:
    roots = (
        "InternetGatewayDevice.TraceRouteDiagnostics",
        "Device.IP.Diagnostics.TraceRoute",
        "Device.IP.Diagnostics.TraceRouteDiagnostics",
    )
    for root in roots:
        if _get(device, f"{root}.DiagnosticsState") is not None:
            return root
    raise RuntimeError("Device does not expose TraceRouteDiagnostics")


def _route_hops(device: dict[str, Any], root: str) -> list[dict[str, Any]]:
    node = _node(device, f"{root}.RouteHops")
    if not isinstance(node, dict):
        return []

    hops: list[dict[str, Any]] = []
    for key, raw in node.items():
        if str(key).startswith("_") or not isinstance(raw, dict):
            continue

        hop_number = _to_int(key)
        host = _get(raw, "HopHost")
        address = _get(raw, "HopHostAddress")
        error_code = _to_int(_get(raw, "HopErrorCode"))
        rtt_raw = _get(raw, "HopRTTimes")

        rtts: list[int] = []
        if isinstance(rtt_raw, str):
            for token in rtt_raw.replace(";", ",").split(","):
                value = _to_int(token.strip())
                if value is not None:
                    rtts.append(value)
        elif isinstance(rtt_raw, (list, tuple)):
            for token in rtt_raw:
                value = _to_int(token)
                if value is not None:
                    rtts.append(value)
        else:
            value = _to_int(rtt_raw)
            if value is not None:
                rtts.append(value)

        hops.append(
            {
                "hop": hop_number,
                "host": host,
                "address": address,
                "error_code": error_code,
                "rtt_ms": rtts[-1] if rtts else None,
                "rtt_samples_ms": rtts,
            }
        )

    hops.sort(key=lambda item: item.get("hop") or 9999)
    return hops


def _extract(device: dict[str, Any], root: str) -> dict[str, Any]:
    raw_state = _get(device, f"{root}.DiagnosticsState", "None")
    state = _normalize_state(raw_state)
    hops = _route_hops(device, root)
    hop_count = _to_int(_get(device, f"{root}.RouteHopsNumberOfEntries"))
    if hop_count is None and hops:
        hop_count = len(hops)

    response_time = _to_int(_get(device, f"{root}.ResponseTime"))
    last = hops[-1] if hops else {}

    return {
        "supported": True,
        "object_path": root,
        "state": state,
        "raw_state": raw_state,
        "host": _get(device, f"{root}.Host"),
        "hops": hop_count,
        "hop_count": hop_count,
        "route_hops": hops,
        "last_hop": last.get("address") or last.get("host"),
        "rtt_ms": last.get("rtt_ms") if last else response_time,
        "response_time_ms": response_time,
    }


async def _task(acs: str, body: dict[str, Any]) -> Any:
    result = await genieacs_client.create_task(acs, body)
    if isinstance(result, dict) and result.get("success") is False:
        raise RuntimeError(f"GenieACS task failed: {result}")
    return result


async def _refresh(acs: str, root: str) -> None:
    await _task(
        acs,
        {
            "name": "refreshObject",
            "objectName": root,
        },
    )


async def traceroute_adapter(context: dict[str, Any]) -> dict[str, Any]:
    """Execute TR-098/TR-181 TraceRoute through the persistent Job Engine."""

    acs = _identity(str(context["device_id"]))
    parameters = context.get("parameters") or {}

    host = str(parameters.get("host") or parameters.get("target") or "8.8.8.8").strip()
    max_hops = int(parameters.get("max_hop_count") or parameters.get("max_hops") or 30)
    tries = int(parameters.get("number_of_tries") or parameters.get("tries") or 3)
    timeout_ms = int(parameters.get("timeout_ms") or 5000)
    packet_size = int(parameters.get("data_block_size") or parameters.get("packet_size") or 56)
    dscp = int(parameters.get("dscp") or 0)
    interface = parameters.get("interface")

    device = await genieacs_client.get_device_raw(acs)
    if not device:
        raise RuntimeError("Device not found in GenieACS")

    root = _select_root(device)

    # Idempotent reset. This prevents stale Completed/Requested results from
    # being interpreted as the result of the new execution.
    await _task(
        acs,
        {
            "name": "setParameterValues",
            "parameterValues": [
                [f"{root}.DiagnosticsState", "None", "xsd:string"],
            ],
        },
    )
    await asyncio.sleep(1)

    parameter_values: list[list[Any]] = [
        [f"{root}.Host", host, "xsd:string"],
        [f"{root}.MaxHopCount", max_hops, "xsd:unsignedInt"],
        [f"{root}.NumberOfTries", tries, "xsd:unsignedInt"],
        [f"{root}.Timeout", timeout_ms, "xsd:unsignedInt"],
        [f"{root}.DataBlockSize", packet_size, "xsd:unsignedInt"],
        [f"{root}.DSCP", dscp, "xsd:unsignedInt"],
    ]
    if interface:
        parameter_values.append([f"{root}.Interface", str(interface), "xsd:string"])
    parameter_values.append([f"{root}.DiagnosticsState", "Requested", "xsd:string"])

    task_result = await _task(
        acs,
        {
            "name": "setParameterValues",
            "parameterValues": parameter_values,
        },
    )

    latest: dict[str, Any] = {}
    refresh_attempts = 0

    # Keep polling bounded by the job timeout. GenieACS may receive the result
    # only after a later Inform, therefore refresh the diagnostic root.
    for attempt in range(1, 61):
        await asyncio.sleep(2)
        if attempt == 1 or attempt % 2 == 0:
            refresh_attempts += 1
            try:
                await _refresh(acs, root)
            except Exception:
                # A refresh failure is not by itself a failed traceroute; the
                # next Inform can still deliver the result.
                pass
            await asyncio.sleep(0.5)

        device = await genieacs_client.get_device_raw(acs)
        if not device:
            continue

        latest = _extract(device, root)
        state = str(latest.get("state") or "").upper()

        if state in TERMINAL_OK:
            break
        if state == "ERROR" or state.startswith(TERMINAL_ERROR_PREFIX):
            break

    state = str(latest.get("state") or "TIMEOUT").upper()
    if state not in TERMINAL_OK:
        raise RuntimeError(f"TraceRoute did not complete: {state}")

    hops = latest.get("route_hops") or []
    last_hop = latest.get("last_hop")
    hop_count = latest.get("hops")

    return {
        **latest,
        "adapter": "GENIEACS_TRACEROUTE",
        "diagnostic_type": "TRACEROUTE",
        "refresh_attempts": refresh_attempts,
        "task": task_result,
        "requested_host": host,
        "message": (
            f"TraceRoute completato verso {host}: "
            f"{hop_count if hop_count is not None else len(hops)} hop"
            + (f", ultimo hop {last_hop}." if last_hop else ".")
        ),
    }
