from __future__ import annotations

# EUREKA27.3.2 - TR143 Download Diagnostics Stable

from datetime import datetime, timezone
from typing import Any
import asyncio
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.genieacs import genieacs_client
from app.modules.diagnostics_history.persistence import persist_download_execution


router = APIRouter(
    prefix="/api/v1/devices",
    tags=["device-diagnostics"],
)


class PingRequest(BaseModel):
    host: str = Field(default="1.1.1.1", min_length=1, max_length=253)
    repetitions: int = Field(default=4, ge=1, le=20)
    timeout_ms: int = Field(default=5000, ge=1000, le=30000)
    data_block_size: int = Field(default=56, ge=1, le=1472)

    @field_validator("host")
    @classmethod
    def validate_host(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("host is required")
        if any(ch.isspace() for ch in value):
            raise ValueError("host must not contain spaces")
        return value


# Stato volatile dell'esecuzione corrente. Non introduce dipendenze DB.
# Viene ricostruito al prossimo test dopo un riavvio del backend.
_EXECUTIONS: dict[str, dict[str, Any]] = {}
REFRESH_INTERVAL_SECONDS = 2.5
EXECUTION_TIMEOUT_SECONDS = 90


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _value(node: Any) -> Any:
    if isinstance(node, dict) and "_value" in node:
        return node.get("_value")
    return node


def _timestamp(node: Any) -> str | None:
    if isinstance(node, dict):
        value = node.get("_timestamp")
        return str(value) if value else None
    return None


def _node(payload: dict[str, Any], dotted_path: str) -> Any:
    current: Any = payload
    for part in dotted_path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _get(payload: dict[str, Any], dotted_path: str, default: Any = None) -> Any:
    current = _value(_node(payload, dotted_path))
    return default if current is None else current


def _to_int(value: Any) -> int | None:
    if value in (None, "", "N/D"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _normalize_state(raw: Any) -> str:
    value = str(raw or "None").strip()
    mapping = {
        "None": "IDLE",
        "Requested": "REQUESTED",
        "Complete": "COMPLETE",
        "Completed": "COMPLETE",
        "Error_CannotResolveHostName": "ERROR",
        "Error_Internal": "ERROR",
        "Error_Other": "ERROR",
    }
    return mapping.get(value, value.upper())


def _quality(avg_ms: int | None, loss: float | None) -> str:
    if avg_ms is None or loss is None:
        return "UNKNOWN"
    if loss == 0 and avg_ms <= 30:
        return "EXCELLENT"
    if loss <= 1 and avg_ms <= 60:
        return "GOOD"
    if loss <= 3 and avg_ms <= 120:
        return "FAIR"
    return "POOR"


def _extract_ping(device: dict[str, Any]) -> dict[str, Any]:
    bases = (
        "Device.IP.Diagnostics.IPPing",
        "InternetGatewayDevice.IPPingDiagnostics",
    )
    selected = bases[0]
    for base in bases:
        if _get(device, f"{base}.DiagnosticsState") is not None:
            selected = base
            break

    raw_state = _get(device, f"{selected}.DiagnosticsState", "None")
    state = _normalize_state(raw_state)
    success = _to_int(_get(device, f"{selected}.SuccessCount"))
    failure = _to_int(_get(device, f"{selected}.FailureCount"))
    repetitions = _to_int(_get(device, f"{selected}.NumberOfRepetitions"))
    sent = repetitions
    if sent is None and success is not None and failure is not None:
        sent = success + failure

    packet_loss_percent = None
    if sent and failure is not None:
        packet_loss_percent = round((failure / sent) * 100, 2)

    minimum = _to_int(_get(device, f"{selected}.MinimumResponseTime"))
    average = _to_int(_get(device, f"{selected}.AverageResponseTime"))
    maximum = _to_int(_get(device, f"{selected}.MaximumResponseTime"))
    state_node = _node(device, f"{selected}.DiagnosticsState")
    observed_at = _timestamp(state_node) or _iso_now()

    return {
        "supported": _get(device, f"{selected}.DiagnosticsState") is not None,
        "object_path": selected,
        "state": state,
        "raw_state": raw_state,
        "host": _get(device, f"{selected}.Host"),
        "repetitions": repetitions,
        "success_count": success,
        "failure_count": failure,
        "packets_sent": sent,
        "packet_loss_percent": packet_loss_percent,
        "minimum_response_time_ms": minimum,
        "average_response_time_ms": average,
        "maximum_response_time_ms": maximum,
        "quality": _quality(average, packet_loss_percent),
        "observed_at": observed_at,
    }


def _event(title: str, detail: str, tone: str, phase: str) -> dict[str, Any]:
    return {
        "key": f"{phase}-{time.time_ns()}",
        "at": _iso_now(),
        "title": title,
        "detail": detail,
        "type": tone,
        "phase": phase,
    }


def _append_event(execution: dict[str, Any], title: str, detail: str, tone: str, phase: str) -> None:
    if execution.get("last_event_phase") == phase:
        return
    execution.setdefault("events", []).append(_event(title, detail, tone, phase))
    execution["events"] = execution["events"][-12:]
    execution["last_event_phase"] = phase


def _public_execution(execution: dict[str, Any] | None) -> dict[str, Any]:
    if not execution:
        return {
            "execution_id": None,
            "execution_state": "IDLE",
            "phase": "IDLE",
            "progress": 0,
            "refresh_attempts": 0,
            "events": [],
        }
    return {
        "execution_id": execution.get("execution_id"),
        "execution_state": execution.get("state", "IDLE"),
        "phase": execution.get("phase", "IDLE"),
        "progress": execution.get("progress", 0),
        "refresh_attempts": execution.get("refresh_attempts", 0),
        "started_at": execution.get("started_at_iso"),
        "requested_host": execution.get("host"),
        "events": execution.get("events", []),
    }


def _same_host(left: Any, right: Any) -> bool:
    return str(left or "").strip().lower().rstrip(".") == str(right or "").strip().lower().rstrip(".")


def _is_current_result(execution: dict[str, Any], current: dict[str, Any]) -> bool:
    if not _same_host(current.get("host"), execution.get("host")):
        return False
    sent = current.get("packets_sent") or current.get("repetitions")
    success = current.get("success_count")
    failure = current.get("failure_count")
    return bool(sent and success is not None and failure is not None and success + failure >= sent)


async def _read_device(acs_device_id: str) -> dict[str, Any]:
    device = await genieacs_client.get_device_raw(acs_device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found in GenieACS")
    return device


@router.post("/{acs_device_id}/diagnostics/ping")
async def start_ping(acs_device_id: str, payload: PingRequest):
    device = await _read_device(acs_device_id)
    current = _extract_ping(device)
    object_path = current["object_path"]
    execution_id = f"PING-{int(time.time() * 1000)}"
    execution = {
        "execution_id": execution_id,
        "host": payload.host,
        "repetitions": payload.repetitions,
        "object_path": object_path,
        "started_at": time.monotonic(),
        "started_at_iso": _iso_now(),
        "last_refresh_at": 0.0,
        "refresh_attempts": 0,
        "state": "REQUESTED",
        "phase": "REQUEST",
        "progress": 10,
        "events": [],
        "last_event_phase": None,
    }
    _append_event(execution, "Test avviato", f"Preparazione del ping verso {payload.host}.", "info", "REQUEST")
    _EXECUTIONS[acs_device_id] = execution

    parameter_values = [
        [f"{object_path}.Host", payload.host, "xsd:string"],
        [f"{object_path}.NumberOfRepetitions", payload.repetitions, "xsd:unsignedInt"],
        [f"{object_path}.Timeout", payload.timeout_ms, "xsd:unsignedInt"],
        [f"{object_path}.DataBlockSize", payload.data_block_size, "xsd:unsignedInt"],
        [f"{object_path}.DiagnosticsState", "Requested", "xsd:string"],
    ]
    result = await genieacs_client.create_task(
        acs_device_id,
        {"name": "setParameterValues", "parameterValues": parameter_values},
    )
    if isinstance(result, dict) and result.get("success") is False:
        execution.update(state="ERROR", phase="ERROR", progress=100)
        _append_event(execution, "Avvio fallito", "GenieACS non ha accettato il task diagnostico.", "error", "ERROR")
        raise HTTPException(status_code=502, detail=result)

    execution.update(state="RUNNING", phase="GENIEACS", progress=28)
    _append_event(execution, "Task ACS creato", "GenieACS ha accettato la richiesta diagnostica.", "success", "GENIEACS")
    return {
        "success": True,
        "acs_device_id": acs_device_id,
        "state": "RUNNING",
        "raw_state": "Requested",
        "host": payload.host,
        "repetitions": payload.repetitions,
        "requested_at": execution["started_at_iso"],
        "task": result,
        **_public_execution(execution),
    }


@router.post("/{acs_device_id}/diagnostics/ping/status")
async def poll_ping_status(acs_device_id: str):
    device = await _read_device(acs_device_id)
    current = _extract_ping(device)
    execution = _EXECUTIONS.get(acs_device_id)

    if not execution:
        return {"acs_device_id": acs_device_id, **current, **_public_execution(None)}

    elapsed = time.monotonic() - execution["started_at"]
    if elapsed >= EXECUTION_TIMEOUT_SECONDS:
        execution.update(state="TIMEOUT", phase="TIMEOUT", progress=100)
        _append_event(execution, "Tempo massimo superato", "Il CPE non ha pubblicato i risultati entro il tempo previsto.", "error", "TIMEOUT")
        return {"acs_device_id": acs_device_id, **current, "state": "TIMEOUT", **_public_execution(execution)}

    if _is_current_result(execution, current):
        current["state"] = "COMPLETE"
        execution.update(state="COMPLETE", phase="COMPLETE", progress=100)
        _append_event(
            execution,
            "Risultati ricevuti",
            f"{current.get('success_count') or 0}/{current.get('packets_sent') or current.get('repetitions') or 0} risposte, latenza media {current.get('average_response_time_ms')} ms.",
            "success",
            "COMPLETE",
        )
        return {"acs_device_id": acs_device_id, **current, **_public_execution(execution)}

    now = time.monotonic()
    if now - execution["last_refresh_at"] >= REFRESH_INTERVAL_SECONDS:
        execution["refresh_attempts"] += 1
        execution["last_refresh_at"] = now
        execution.update(state="RUNNING", phase="CPE_REFRESH", progress=min(82, 42 + execution["refresh_attempts"] * 10))
        _append_event(
            execution,
            "Aggiornamento CPE richiesto",
            f"Refresh automatico IPPing n. {execution['refresh_attempts']} inviato tramite GenieACS.",
            "running",
            f"CPE_REFRESH_{execution['refresh_attempts']}",
        )
        refresh = await genieacs_client.create_task(
            acs_device_id,
            {"name": "refreshObject", "objectName": execution["object_path"]},
        )
        if isinstance(refresh, dict) and refresh.get("success") is False:
            execution.update(state="ERROR", phase="ERROR", progress=100)
            _append_event(execution, "Refresh non riuscito", "GenieACS non ha accettato la richiesta di aggiornamento.", "error", "ERROR")
            return {"acs_device_id": acs_device_id, **current, "state": "ERROR", "refresh_task": refresh, **_public_execution(execution)}

    execution.update(state="RUNNING")
    current["state"] = "RUNNING"
    return {"acs_device_id": acs_device_id, **current, **_public_execution(execution)}


@router.post("/{acs_device_id}/diagnostics/ping/refresh")
async def refresh_ping(acs_device_id: str):
    device = await _read_device(acs_device_id)
    current = _extract_ping(device)
    execution = _EXECUTIONS.get(acs_device_id)
    object_path = execution.get("object_path") if execution else current["object_path"]
    result = await genieacs_client.create_task(
        acs_device_id,
        {"name": "refreshObject", "objectName": object_path},
    )
    if execution:
        execution["refresh_attempts"] += 1
        execution["last_refresh_at"] = time.monotonic()
        execution.update(state="RUNNING", phase="CPE_REFRESH", progress=min(88, max(55, execution.get("progress", 0) + 8)))
        _append_event(execution, "Refresh manuale inviato", "Aggiornamento immediato dell'oggetto IPPing richiesto.", "running", f"MANUAL_{execution['refresh_attempts']}")
    return {"success": True, "refresh_task": result, **current, **_public_execution(execution)}


@router.get("/{acs_device_id}/diagnostics/ping")
async def get_ping(acs_device_id: str):
    device = await _read_device(acs_device_id)
    return {"acs_device_id": acs_device_id, **_extract_ping(device), **_public_execution(_EXECUTIONS.get(acs_device_id))}


# ---------------------------------------------------------------------------
# EUREKA27.0.0 - TR-143 Download Diagnostics Foundation
# ---------------------------------------------------------------------------

from urllib.parse import urlparse


class DownloadDiagnosticsRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
    interface: str | None = Field(default=None, max_length=512)
    dscp: int = Field(default=0, ge=0, le=63)
    ethernet_priority: int = Field(default=0, ge=0, le=7)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme.lower() not in {"http", "ftp"}:
            raise ValueError("TR-143 download URL must use http or ftp")
        if not parsed.netloc:
            raise ValueError("download URL must contain a host")
        return value


_DOWNLOAD_EXECUTIONS: dict[str, dict[str, Any]] = {}
DOWNLOAD_REFRESH_INTERVAL_SECONDS = 3.0
DOWNLOAD_EXECUTION_TIMEOUT_SECONDS = 180

DOWNLOAD_ACTIVE_STATES = {"REQUESTED", "RUNNING"}
DOWNLOAD_RESET_ATTEMPTS = 5
DOWNLOAD_RESET_SETTLE_SECONDS = 1.0


def _download_execution_is_active(execution: dict[str, Any] | None) -> bool:
    if not execution:
        return False
    return str(execution.get("state") or "").upper() in DOWNLOAD_ACTIVE_STATES


async def _reset_download_diagnostics_state(
    acs_device_id: str,
    object_path: str,
) -> dict[str, Any]:
    """Create a real None -> Requested edge before every TR-143 download."""
    reset_task = await genieacs_client.create_task(
        acs_device_id,
        {
            "name": "setParameterValues",
            "parameterValues": [
                [
                    f"{object_path}.DiagnosticsState",
                    "None",
                    "xsd:string",
                ],
            ],
        },
    )

    if isinstance(reset_task, dict) and reset_task.get("success") is False:
        return {
            "success": False,
            "state": None,
            "reset_task": reset_task,
            "attempts": 0,
        }

    latest = None
    for attempt in range(1, DOWNLOAD_RESET_ATTEMPTS + 1):
        await asyncio.sleep(DOWNLOAD_RESET_SETTLE_SECONDS)
        refresh_task = await genieacs_client.create_task(
            acs_device_id,
            {
                "name": "refreshObject",
                "objectName": object_path,
            },
        )
        if isinstance(refresh_task, dict) and refresh_task.get("success") is False:
            return {
                "success": False,
                "state": latest,
                "reset_task": reset_task,
                "refresh_task": refresh_task,
                "attempts": attempt,
            }
        await asyncio.sleep(DOWNLOAD_RESET_SETTLE_SECONDS)
        latest = _extract_download(await _read_device(acs_device_id))
        if latest.get("state") == "IDLE":
            return {
                "success": True,
                "state": latest,
                "reset_task": reset_task,
                "attempts": attempt,
            }

    return {
        "success": False,
        "state": latest,
        "reset_task": reset_task,
        "attempts": DOWNLOAD_RESET_ATTEMPTS,
    }



def _to_datetime(value: Any) -> datetime | None:
    if value in (None, "", "0001-01-01T00:00:00Z", "1970-01-01T00:00:00.000Z"):
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(text)
    except (TypeError, ValueError):
        return None


def _duration_ms(start: Any, end: Any) -> int | None:
    start_dt = _to_datetime(start)
    end_dt = _to_datetime(end)
    if not start_dt or not end_dt or end_dt < start_dt:
        return None
    return max(0, int((end_dt - start_dt).total_seconds() * 1000))


def _normalize_download_state(raw: Any) -> str:
    value = str(raw or "None").strip()
    if value == "None":
        return "IDLE"
    if value == "Requested":
        return "REQUESTED"
    if value == "Complete":
        return "COMPLETE"
    if value.startswith("Error_"):
        return "ERROR"
    return value.upper()


def _extract_download(device: dict[str, Any]) -> dict[str, Any]:
    bases = (
        "Device.IP.Diagnostics.DownloadDiagnostics",
        "InternetGatewayDevice.DownloadDiagnostics",
    )
    selected = bases[0]
    supported = False
    for base in bases:
        if _get(device, f"{base}.DiagnosticsState") is not None:
            selected = base
            supported = True
            break

    raw_state = _get(device, f"{selected}.DiagnosticsState", "None")
    state = _normalize_download_state(raw_state)
    download_url = _get(device, f"{selected}.DownloadURL")
    test_bytes = _to_int(_get(device, f"{selected}.TestBytesReceived"))
    total_bytes = _to_int(_get(device, f"{selected}.TotalBytesReceived"))
    rom_time = _get(device, f"{selected}.ROMTime")
    bom_time = _get(device, f"{selected}.BOMTime")
    eom_time = _get(device, f"{selected}.EOMTime")
    tcp_request = _get(device, f"{selected}.TCPOpenRequestTime")
    tcp_response = _get(device, f"{selected}.TCPOpenResponseTime")
    duration_ms = _duration_ms(bom_time, eom_time)
    tcp_open_ms = _duration_ms(tcp_request, tcp_response)

    throughput_mbps = None
    bytes_for_rate = test_bytes if test_bytes not in (None, 0) else total_bytes
    if bytes_for_rate and duration_ms and duration_ms > 0:
        throughput_mbps = round((bytes_for_rate * 8) / (duration_ms / 1000) / 1_000_000, 2)

    state_node = _node(device, f"{selected}.DiagnosticsState")
    return {
        "supported": supported,
        "object_path": selected,
        "state": state,
        "raw_state": raw_state,
        "download_url": download_url,
        "download_transports": _get(device, f"{selected}.DownloadTransports"),
        "interface": _get(device, f"{selected}.Interface"),
        "dscp": _to_int(_get(device, f"{selected}.DSCP")),
        "ethernet_priority": _to_int(_get(device, f"{selected}.EthernetPriority")),
        "test_bytes_received": test_bytes,
        "total_bytes_received": total_bytes,
        "rom_time": rom_time,
        "bom_time": bom_time,
        "eom_time": eom_time,
        "tcp_open_request_time": tcp_request,
        "tcp_open_response_time": tcp_response,
        "duration_ms": duration_ms,
        "tcp_open_ms": tcp_open_ms,
        "throughput_mbps": throughput_mbps,
        "observed_at": _timestamp(state_node) or _iso_now(),
    }


def _public_download_execution(execution: dict[str, Any] | None) -> dict[str, Any]:
    if not execution:
        return {
            "execution_id": None,
            "execution_state": "IDLE",
            "phase": "IDLE",
            "progress": 0,
            "refresh_attempts": 0,
            "events": [],
        }
    return {
        "execution_id": execution.get("execution_id"),
        "execution_state": execution.get("state", "IDLE"),
        "phase": execution.get("phase", "IDLE"),
        "progress": execution.get("progress", 0),
        "refresh_attempts": execution.get("refresh_attempts", 0),
        "started_at": execution.get("started_at_iso"),
        "requested_url": execution.get("url"),
        "events": execution.get("events", []),
    }


def _same_url(left: Any, right: Any) -> bool:
    return str(left or "").strip() == str(right or "").strip()


def _is_current_download_result(execution: dict[str, Any], current: dict[str, Any]) -> bool:
    if not _same_url(current.get("download_url"), execution.get("url")):
        return False
    if current.get("state") == "ERROR":
        return True
    return bool(
        current.get("state") in {"COMPLETE", "COMPLETED"}
        and max(
            current.get("test_bytes_received") or 0,
            current.get("total_bytes_received") or 0,
        ) > 0
        and (current.get("duration_ms") or 0) > 0
    )


# EUREKA28.1.0 - TR143 Download History Persistence
def _persist_download_history_safe(acs_device_id: str, execution: dict[str, Any], current: dict[str, Any] | None = None) -> None:
    try:
        persist_download_execution(acs_device_id, execution, current)
    except Exception as exc:
        print(f"[EUREKA28.1.0] persistence warning: {exc}")


@router.get("/{acs_device_id}/diagnostics/download/capability")
async def get_download_capability(acs_device_id: str):
    device = await _read_device(acs_device_id)
    current = _extract_download(device)
    return {
        "acs_device_id": acs_device_id,
        "supported": current["supported"],
        "object_path": current["object_path"],
        "download_transports": current.get("download_transports"),
        "state": current.get("state"),
    }


@router.post("/{acs_device_id}/diagnostics/download")
async def start_download_diagnostics(
    acs_device_id: str,
    payload: DownloadDiagnosticsRequest,
):
    existing = _DOWNLOAD_EXECUTIONS.get(acs_device_id)
    if _download_execution_is_active(existing):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "TR143_DOWNLOAD_ALREADY_RUNNING",
                "message": "A TR-143 download is already active for this device.",
                "execution_id": existing.get("execution_id"),
                "phase": existing.get("phase"),
            },
        )

    device = await _read_device(acs_device_id)
    current = _extract_download(device)
    if not current["supported"]:
        raise HTTPException(
            status_code=409,
            detail="Device does not expose TR-143 DownloadDiagnostics",
        )

    object_path = current["object_path"]
    execution_id = f"DOWNLOAD-{int(time.time() * 1000)}"
    execution = {
        "execution_id": execution_id,
        "url": payload.url,
        "object_path": object_path,
        "started_at": time.monotonic(),
        "started_at_iso": _iso_now(),
        "last_refresh_at": 0.0,
        "refresh_attempts": 0,
        "state": "REQUESTED",
        "phase": "RESET",
        "progress": 4,
        "events": [],
        "last_event_phase": None,
    }

    _DOWNLOAD_EXECUTIONS[acs_device_id] = execution
    _append_event(
        execution,
        "Reset TR-143",
        "Ripristino DiagnosticsState=None prima della nuova esecuzione.",
        "info",
        "RESET",
    )
    _persist_download_history_safe(acs_device_id, execution, current)

    reset = await _reset_download_diagnostics_state(acs_device_id, object_path)
    if not reset.get("success"):
        latest = reset.get("state") or current
        execution.update(state="ERROR", phase="RESET_ERROR", progress=100)
        _append_event(
            execution,
            "Reset TR-143 fallito",
            "Il CPE non ha confermato DiagnosticsState=None.",
            "error",
            "RESET_ERROR",
        )
        _persist_download_history_safe(acs_device_id, execution, latest)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "TR143_RESET_FAILED",
                "message": "Unable to reset DownloadDiagnostics to None.",
                "reset": reset,
            },
        )

    current = reset.get("state") or current
    execution.update(state="REQUESTED", phase="CONFIGURE", progress=10)
    _append_event(
        execution,
        "TR-143 pronto",
        "DiagnosticsState=None confermato; configurazione del download.",
        "success",
        "CONFIGURE",
    )
    _persist_download_history_safe(acs_device_id, execution, current)

    parameter_values = [
        [f"{object_path}.DownloadURL", payload.url, "xsd:string"],
        [f"{object_path}.DSCP", payload.dscp, "xsd:unsignedInt"],
        [f"{object_path}.EthernetPriority", payload.ethernet_priority, "xsd:unsignedInt"],
    ]
    if current.get("object_path") == "InternetGatewayDevice.DownloadDiagnostics":
        parameter_values.append([f"{object_path}.NumberOfConnections", 1, "xsd:unsignedInt"])
    if payload.interface:
        parameter_values.append([f"{object_path}.Interface", payload.interface, "xsd:string"])
    parameter_values.append([f"{object_path}.DiagnosticsState", "Requested", "xsd:string"])

    result = await genieacs_client.create_task(
        acs_device_id,
        {"name": "setParameterValues", "parameterValues": parameter_values},
    )
    if isinstance(result, dict) and result.get("success") is False:
        execution.update(state="ERROR", phase="ERROR", progress=100)
        _append_event(execution, "Avvio fallito", "GenieACS non ha accettato il task TR-143.", "error", "ERROR")
        _persist_download_history_safe(acs_device_id, execution, current)
        raise HTTPException(status_code=502, detail=result)

    execution.update(state="RUNNING", phase="GENIEACS", progress=24)
    _append_event(
        execution,
        "Task ACS creato",
        "GenieACS ha accettato la diagnostica dopo il reset idempotente None -> Requested.",
        "success",
        "GENIEACS",
    )
    _persist_download_history_safe(acs_device_id, execution, current)
    return {
        "success": True,
        "acs_device_id": acs_device_id,
        "state": "RUNNING",
        "download_url": payload.url,
        "reset": {"success": True, "attempts": reset.get("attempts", 0)},
        "task": result,
        **_public_download_execution(execution),
    }


@router.post("/{acs_device_id}/diagnostics/download/status")
async def poll_download_status(acs_device_id: str):
    device = await _read_device(acs_device_id)
    current = _extract_download(device)
    execution = _DOWNLOAD_EXECUTIONS.get(acs_device_id)

    if execution:
        trace_snapshot = {
            "raw_state": current.get("raw_state"),
            "state": current.get("state"),
            "download_url": current.get("download_url"),
            "test_bytes_received": current.get("test_bytes_received"),
            "total_bytes_received": current.get("total_bytes_received"),
            "rom_time": current.get("rom_time"),
            "bom_time": current.get("bom_time"),
            "eom_time": current.get("eom_time"),
            "tcp_open_request_time": current.get("tcp_open_request_time"),
            "tcp_open_response_time": current.get("tcp_open_response_time"),
            "duration_ms": current.get("duration_ms"),
            "throughput_mbps": current.get("throughput_mbps"),
            "observed_at": current.get("observed_at"),
        }

        if trace_snapshot != execution.get("_last_trace_snapshot"):
            execution["_last_trace_snapshot"] = trace_snapshot

            print(
                "[TR143-TRACE]",
                {
                    "acs_device_id": acs_device_id,
                    "execution_id": execution.get("execution_id"),
                    "execution_state": execution.get("state"),
                    "phase": execution.get("phase"),
                    "refresh_attempts": execution.get("refresh_attempts"),
                    "requested_url": execution.get("url"),
                    **trace_snapshot,
                },
                flush=True,
            )

    if not execution:
        return {"acs_device_id": acs_device_id, **current, **_public_download_execution(None)}

    elapsed = time.monotonic() - execution["started_at"]
    if elapsed >= DOWNLOAD_EXECUTION_TIMEOUT_SECONDS:
        execution.update(state="TIMEOUT", phase="TIMEOUT", progress=100)
        _append_event(execution, "Tempo massimo superato", "Il CPE non ha completato il download entro 180 secondi.", "error", "TIMEOUT")
        _persist_download_history_safe(acs_device_id, execution, current)
        return {"acs_device_id": acs_device_id, **current, "state": "TIMEOUT", **_public_download_execution(execution)}

    if _is_current_download_result(execution, current):
        if current.get("state") == "ERROR":
            execution.update(state="ERROR", phase="ERROR", progress=100)
            _append_event(execution, "Diagnostica fallita", str(current.get("raw_state") or "Errore TR-143"), "error", "ERROR")
        else:
            execution.update(state="COMPLETE", phase="COMPLETE", progress=100)
            _append_event(
                execution,
                "Risultato ricevuto",
                f"Download completato: {current.get('throughput_mbps')} Mbps, {current.get('test_bytes_received') or current.get('total_bytes_received')} byte.",
                "success",
                "COMPLETE",
            )
        _persist_download_history_safe(acs_device_id, execution, current)
        return {"acs_device_id": acs_device_id, **current, **_public_download_execution(execution)}

    now = time.monotonic()
    if now - execution["last_refresh_at"] >= DOWNLOAD_REFRESH_INTERVAL_SECONDS:
        execution["refresh_attempts"] += 1
        execution["last_refresh_at"] = now
        progress = min(88, 38 + execution["refresh_attempts"] * 9)
        execution.update(state="RUNNING", phase="CPE_REFRESH", progress=progress)
        _append_event(
            execution,
            "Aggiornamento CPE richiesto",
            f"Refresh automatico DownloadDiagnostics n. {execution['refresh_attempts']} inviato.",
            "running",
            f"DOWNLOAD_REFRESH_{execution['refresh_attempts']}",
        )
        refresh = await genieacs_client.create_task(
            acs_device_id,
            {"name": "refreshObject", "objectName": execution["object_path"]},
        )
        if isinstance(refresh, dict) and refresh.get("success") is False:
            execution.update(state="ERROR", phase="ERROR", progress=100)
            _append_event(execution, "Refresh non riuscito", "GenieACS non ha accettato il refresh TR-143.", "error", "ERROR")
            _persist_download_history_safe(acs_device_id, execution, current)
            return {"acs_device_id": acs_device_id, **current, "state": "ERROR", "refresh_task": refresh, **_public_download_execution(execution)}

    execution.update(state="RUNNING")
    current["state"] = "RUNNING"
    return {"acs_device_id": acs_device_id, **current, **_public_download_execution(execution)}


@router.post("/{acs_device_id}/diagnostics/download/refresh")
async def refresh_download_diagnostics(acs_device_id: str):
    device = await _read_device(acs_device_id)
    current = _extract_download(device)
    execution = _DOWNLOAD_EXECUTIONS.get(acs_device_id)
    object_path = execution.get("object_path") if execution else current["object_path"]
    result = await genieacs_client.create_task(
        acs_device_id,
        {"name": "refreshObject", "objectName": object_path},
    )
    if execution:
        execution["refresh_attempts"] += 1
        execution["last_refresh_at"] = time.monotonic()
        execution.update(state="RUNNING", phase="CPE_REFRESH", progress=min(92, max(55, execution.get("progress", 0) + 8)))
        _append_event(execution, "Refresh manuale inviato", "Aggiornamento immediato DownloadDiagnostics richiesto.", "running", f"DOWNLOAD_MANUAL_{execution['refresh_attempts']}")
    return {"success": True, "refresh_task": result, **current, **_public_download_execution(execution)}


@router.get("/{acs_device_id}/diagnostics/download")
async def get_download_diagnostics(acs_device_id: str):
    device = await _read_device(acs_device_id)
    return {
        "acs_device_id": acs_device_id,
        **_extract_download(device),
        **_public_download_execution(_DOWNLOAD_EXECUTIONS.get(acs_device_id)),
    }
