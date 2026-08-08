from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from .jobs.carrier_adapters import download_adapter, ping_adapter, speedtest_adapter

from .jobs.traceroute import traceroute_adapter
from .jobs.wifi_scan import wifi_scan

DiagnosticHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


async def foundation_probe(context: dict[str, Any]) -> dict[str, Any]:
    """Non-invasive handler used to validate the engine lifecycle."""
    return {
        "engine": "device_diagnostics",
        "diagnostic_type": "FOUNDATION_PROBE",
        "device_id": context["device_id"],
        "parameters": context.get("parameters") or {},
        "message": "Diagnostics Engine foundation operational",
    }


DIAGNOSTIC_HANDLERS: dict[str, DiagnosticHandler] = {
    "TR143_SPEEDTEST": speedtest_adapter,
    "DOWNLOAD_DIAGNOSTIC": download_adapter,
    "PING": ping_adapter,
    "TRACEROUTE": traceroute_adapter,
    "FOUNDATION_PROBE": foundation_probe,
    "WIFI_SCAN": wifi_scan,
}


def get_handler(diagnostic_type: str) -> DiagnosticHandler | None:
    return DIAGNOSTIC_HANDLERS.get(diagnostic_type.strip().upper())


def list_diagnostic_types() -> list[str]:
    return sorted(DIAGNOSTIC_HANDLERS)
