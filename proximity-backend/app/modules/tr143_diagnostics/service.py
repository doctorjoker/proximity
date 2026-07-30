from __future__ import annotations

import asyncio
import json
import logging
import os
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit
from uuid import UUID, uuid4

import httpx

from .http_collector import NginxDiagnosticLogCollector
from .schemas import DiagnosticEvent, DownloadExecution, DownloadResult, ServerEvidence
from .validator import TR143Validator


TR143_ROOT = "Device.IP.Diagnostics.DownloadDiagnostics"
logger = logging.getLogger(__name__)
print("[TR143] MODULE LOADED: " + __file__, flush=True)
TERMINAL_STATES = {
    "Completed",
    "Error_InitConnectionFailed",
    "Error_CannotResolveHostName",
    "Error_NoResponse",
    "Error_TransferFailed",
    "Error_PasswordRequestFailed",
    "Error_LoginFailed",
    "Error_NoTransferMode",
    "Error_NoPASV",
    "Error_IncorrectSize",
    "Error_Timeout",
}
ERROR_STATES = TERMINAL_STATES - {"Completed"}


class DiagnosticError(RuntimeError):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class TR143DownloadService:
    """TR-143 orchestrator with CPE polling and Nginx server-side evidence."""

    def __init__(self) -> None:
        self.enabled = _env_bool("DIAGNOSTIC_SERVER_ENABLED", True)
        self.base_url = os.getenv(
            "DIAGNOSTIC_SERVER_BASE_URL", "http://10.40.0.22:8081"
        ).rstrip("/")
        self.default_file = os.getenv("DIAGNOSTIC_DOWNLOAD_FILE", "100MB.bin")
        self.default_timeout = int(os.getenv("DIAGNOSTIC_TIMEOUT", "300"))
        self.poll_interval = float(os.getenv("DIAGNOSTIC_POLL_INTERVAL", "3"))
        self.error_grace_seconds = int(
            os.getenv("DIAGNOSTIC_ERROR_GRACE_SECONDS", "30")
        )
        self.genieacs_nbi_url = os.getenv(
            "GENIEACS_NBI_URL",
            os.getenv("GENIEACS_NBI_BASE_URL", "http://127.0.0.1:7557"),
        ).rstrip("/")
        self._executions: dict[UUID, DownloadExecution] = {}
        self._tasks: dict[UUID, asyncio.Task[None]] = {}
        self._lock = asyncio.Lock()
        self.validator = TR143Validator()
        self.http_collector = NginxDiagnosticLogCollector()

    def build_download_url(self, file_name: str | None = None) -> str:
        selected = (file_name or self.default_file).strip().lstrip("/")
        if not selected or "/" in selected or ".." in selected:
            raise DiagnosticError("Invalid diagnostic file name")
        return f"{self.base_url}/download/{selected}"

    async def start(
        self,
        device_id: str,
        *,
        file_name: str | None = None,
        download_url: str | None = None,
        timeout_seconds: int | None = None,
    ) -> DownloadExecution:
        if not self.enabled:
            raise DiagnosticError("Diagnostic server is disabled")

        selected_file = file_name or self.default_file
        execution_id = uuid4()
        selected_url = download_url or self.build_download_url(selected_file)
        selected_url = self._with_execution_id(str(selected_url), execution_id)
        timeout = timeout_seconds or self.default_timeout
        now = utcnow()
        execution = DownloadExecution(
            execution_id=execution_id,
            device_id=device_id,
            status="QUEUED",
            progress=0,
            download_url=selected_url,
            file_name=selected_file,
            started_at=now,
            updated_at=now,
            events=[
                DiagnosticEvent(
                    timestamp=now,
                    code="QUEUED",
                    label="Diagnostic queued",
                    status="PENDING",
                    detail=f"execution={execution_id}",
                )
            ],
        )
        async with self._lock:
            self._executions[execution_id] = execution
            self._tasks[execution_id] = asyncio.create_task(
                self._run(execution_id, timeout)
            )
        return deepcopy(execution)

    async def get(self, execution_id: UUID) -> DownloadExecution | None:
        async with self._lock:
            execution = self._executions.get(execution_id)
            return deepcopy(execution) if execution else None

    async def capability(self, device_id: str) -> dict[str, Any]:
        device = await self._fetch_device(device_id)
        raw = self._extract_object(device, TR143_ROOT)
        return {
            "supported": bool(raw),
            "object_path": TR143_ROOT,
            "download_transports": self._value(raw.get("DownloadTransports")),
            "diagnostics_state": self._value(raw.get("DiagnosticsState")),
            "available_parameters": sorted(
                key for key, value in raw.items()
                if not key.startswith("_") and value is not None
            ),
        }

    async def _run(self, execution_id: UUID, timeout: int) -> None:
        last_error_state: str | None = None
        error_first_seen: float | None = None
        error_event_written = False
        latest_raw: dict[str, Any] = {}
        try:
            await self._update(
                execution_id,
                status="PREPARING",
                progress=10,
                event=("ACS_REFRESH", "Refreshing TR-143 object", "RUNNING", None),
            )
            execution = await self._require(execution_id)
            await self._post_task(
                execution.device_id,
                {"name": "refreshObject", "objectName": TR143_ROOT},
                connection_request=True,
            )

            await self._update(
                execution_id,
                progress=25,
                event=("ROUTER_READY", "Router diagnostic object refreshed", "SUCCESS", None),
            )

            await self._post_task(
                execution.device_id,
                {
                    "name": "setParameterValues",
                    "parameterValues": [
                        [f"{TR143_ROOT}.DownloadURL", execution.download_url, "xsd:string"],
                        [f"{TR143_ROOT}.DiagnosticsState", "Requested", "xsd:string"],
                    ],
                },
                connection_request=True,
            )
            await self._update(
                execution_id,
                status="REQUESTED",
                progress=40,
                event=(
                    "DOWNLOAD_REQUESTED",
                    "TR-143 download requested",
                    "SUCCESS",
                    execution.download_url,
                ),
            )

            loop = asyncio.get_running_loop()
            deadline = loop.time() + timeout
            while loop.time() < deadline:
                await asyncio.sleep(self.poll_interval)
                execution = await self._require(execution_id)

                evidence = self.http_collector.find_execution(
                    execution.execution_id, execution.started_at
                )
                if self._valid_server_evidence(evidence):
                    await self._update(
                        execution_id,
                        status="WAITING_FOR_RESULT",
                        progress=90,
                        event=(
                            "SERVER_DOWNLOAD_OBSERVED",
                            "Diagnostic server observed the CPE download",
                            "SUCCESS",
                            f"HTTP {evidence.http_status}; {evidence.bytes_sent} bytes; source {evidence.source_ip}",
                        ),
                    )
                    # One final ACS refresh is best effort. Server evidence remains authoritative.
                    await self._post_task(
                        execution.device_id,
                        {"name": "refreshObject", "objectName": TR143_ROOT},
                        connection_request=True,
                        tolerate_error=True,
                    )
                    await asyncio.sleep(min(2.0, self.poll_interval))
                    device = await self._fetch_device(execution.device_id)
                    latest_raw = self._extract_object(device, TR143_ROOT)
                    result = self._build_result(latest_raw, evidence=evidence)
                    await self._complete(execution_id, result)
                    return

                await self._post_task(
                    execution.device_id,
                    {"name": "refreshObject", "objectName": TR143_ROOT},
                    connection_request=True,
                    tolerate_error=True,
                )
                await asyncio.sleep(min(1.0, self.poll_interval))
                device = await self._fetch_device(execution.device_id)
                latest_raw = self._extract_object(device, TR143_ROOT)
                state = str(
                    self._value(latest_raw.get("DiagnosticsState")) or ""
                ).strip()

                if state == "Completed":
                    result = self._build_result(latest_raw)
                    # A valid CPE result may finish without server evidence, but stale/zero
                    # TP-Link results must keep waiting for the correlated HTTP request.
                    if self._has_meaningful_cpe_result(result):
                        await self._complete(execution_id, result)
                        return
                    await self._update(
                        execution_id,
                        status="WAITING_FOR_RESULT",
                        progress=80,
                    )
                    continue

                if state in ERROR_STATES:
                    if state != last_error_state:
                        last_error_state = state
                        error_first_seen = loop.time()
                        error_event_written = False
                    if not error_event_written:
                        await self._update(
                            execution_id,
                            status="WAITING_FOR_RESULT",
                            progress=70,
                            event=(
                                "TRANSIENT_CPE_ERROR",
                                "CPE reported a provisional diagnostic error",
                                "WARNING",
                                f"{state}; waiting {self.error_grace_seconds}s for server evidence",
                            ),
                        )
                        error_event_written = True
                    if (
                        error_first_seen is not None
                        and loop.time() - error_first_seen >= self.error_grace_seconds
                    ):
                        # Check the log once more before declaring a real failure.
                        evidence = self.http_collector.find_execution(
                            execution.execution_id, execution.started_at
                        )
                        if self._valid_server_evidence(evidence):
                            result = self._build_result(latest_raw, evidence=evidence)
                            await self._complete(execution_id, result)
                            return
                        result = self._build_result(latest_raw)
                        await self._fail(
                            execution_id,
                            f"TR-143 remained in {state} for {self.error_grace_seconds} seconds and no HTTP download was observed",
                            status="FAILED",
                            result=result,
                        )
                        return
                    continue

                if state and state not in {"None", "Requested"}:
                    await self._update(
                        execution_id,
                        status="RUNNING",
                        progress=65,
                    )
                else:
                    await self._update(
                        execution_id,
                        status="WAITING_FOR_RESULT",
                        progress=60,
                    )

            execution = await self._require(execution_id)
            evidence = self.http_collector.find_execution(
                execution.execution_id, execution.started_at
            )
            if self._valid_server_evidence(evidence):
                result = self._build_result(latest_raw, evidence=evidence)
                await self._complete(execution_id, result)
                return
            await self._fail(
                execution_id,
                f"Diagnostic timed out after {timeout} seconds; no correlated HTTP download found",
                status="TIMED_OUT",
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            await self._fail(execution_id, str(exc), status="FAILED")

    async def _complete(self, execution_id: UUID, result: DownloadResult) -> None:
        now = utcnow()
        validation = self.validator.validate(result)
        server_verified = self._valid_server_evidence(result.server_evidence)
        if server_verified and result.result_source != "CPE_AND_SERVER":
            execution_status = "COMPLETED_WITH_SERVER_EVIDENCE"
            event_status = "WARNING" if validation.warnings else "SUCCESS"
            detail = (
                f"Server verified {result.server_evidence.bytes_sent} bytes; "
                f"validation score {validation.score}/100"
            )
        elif validation.status == "VALID":
            execution_status = "COMPLETED"
            event_status = "SUCCESS"
            detail = f"Validation score {validation.score}/100"
        elif validation.status == "WARNING":
            execution_status = "COMPLETED_WITH_WARNINGS"
            event_status = "WARNING"
            detail = "; ".join(validation.warnings) or f"Validation score {validation.score}/100"
        else:
            execution_status = "FAILED_VALIDATION"
            event_status = "ERROR"
            detail = "; ".join(validation.errors or validation.warnings)

        async with self._lock:
            execution = self._executions[execution_id]
            execution.status = execution_status
            execution.progress = 100
            execution.updated_at = now
            execution.completed_at = now
            execution.result = result
            execution.validation = validation
            if execution_status == "FAILED_VALIDATION":
                execution.error = detail or "TR-143 result validation failed"
            execution.events.append(
                DiagnosticEvent(
                    timestamp=now,
                    code="RESULTS_RECEIVED",
                    label="TR-143 results collected",
                    status="SUCCESS",
                    detail=f"source={result.result_source}",
                )
            )
            execution.events.append(
                DiagnosticEvent(
                    timestamp=now,
                    code="RESULTS_VALIDATED",
                    label="TR-143 result validation completed",
                    status=event_status,
                    detail=detail,
                )
            )

    async def _fail(
        self,
        execution_id: UUID,
        message: str,
        *,
        status: str,
        result: DownloadResult | None = None,
    ) -> None:
        now = utcnow()
        async with self._lock:
            execution = self._executions.get(execution_id)
            if not execution:
                return
            execution.status = status  # type: ignore[assignment]
            execution.progress = 100
            execution.updated_at = now
            execution.completed_at = now
            execution.error = message
            execution.result = result
            execution.events.append(
                DiagnosticEvent(
                    timestamp=now,
                    code=status,
                    label="Diagnostic failed" if status == "FAILED" else "Diagnostic timed out",
                    status="ERROR",
                    detail=message,
                )
            )

    async def _update(
        self,
        execution_id: UUID,
        *,
        status: str | None = None,
        progress: int | None = None,
        event: tuple[str, str, str, str | None] | None = None,
    ) -> None:
        now = utcnow()
        async with self._lock:
            execution = self._executions[execution_id]
            if status is not None:
                execution.status = status  # type: ignore[assignment]
            if progress is not None:
                execution.progress = progress
            execution.updated_at = now
            if event:
                code, label, event_status, detail = event
                # Avoid duplicate polling events with the same code/detail.
                if not execution.events or (
                    execution.events[-1].code != code
                    or execution.events[-1].detail != detail
                ):
                    execution.events.append(
                        DiagnosticEvent(
                            timestamp=now,
                            code=code,
                            label=label,
                            status=event_status,  # type: ignore[arg-type]
                            detail=detail,
                        )
                    )

    async def _require(self, execution_id: UUID) -> DownloadExecution:
        execution = await self.get(execution_id)
        if not execution:
            raise DiagnosticError("Diagnostic execution not found")
        return execution

    async def _fetch_device(self, device_id: str) -> dict[str, Any]:
        query = json.dumps({"_id": device_id}, separators=(",", ":"))
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.genieacs_nbi_url}/devices/",
                params={"query": query},
            )
            response.raise_for_status()
            items = response.json()
        if not items:
            raise DiagnosticError(f"ACS device not found: {device_id}")
        return items[0]

    async def _post_task(
        self,
        device_id: str,
        payload: dict[str, Any],
        *,
        connection_request: bool,
        tolerate_error: bool = False,
    ) -> dict[str, Any] | None:
        encoded_id = quote(device_id, safe="")
        params = {"connection_request": ""} if connection_request else None
        try:
            logger.warning(
                "[TR143] POST TASK device=%s payload=%s",
                device_id,
                json.dumps(payload, ensure_ascii=False),
            )

            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    f"{self.genieacs_nbi_url}/devices/{encoded_id}/tasks",
                    params=params,
                    json=payload,
                )
                response.raise_for_status()
                return response.json() if response.content else None
        except Exception:
            if tolerate_error:
                return None
            raise

    def _build_result(
        self,
        raw: dict[str, Any],
        *,
        evidence: ServerEvidence | None = None,
    ) -> DownloadResult:
        state = self._value(raw.get("DiagnosticsState"))
        rom = self._parse_time(self._value(raw.get("ROMTime")))
        bom = self._parse_time(self._value(raw.get("BOMTime")))
        eom = self._parse_time(self._value(raw.get("EOMTime")))
        tcp_req = self._parse_time(self._value(raw.get("TCPOpenRequestTime")))
        tcp_res = self._parse_time(self._value(raw.get("TCPOpenResponseTime")))
        test_bytes = self._as_int(self._value(raw.get("TestBytesReceived")))
        total_bytes = self._as_int(self._value(raw.get("TotalBytesReceived")))
        duration_ms = self._delta_ms(bom or rom, eom)
        tcp_open_ms = self._delta_ms(tcp_req, tcp_res)
        bytes_for_rate = test_bytes or total_bytes
        throughput = None
        if bytes_for_rate is not None and duration_ms and duration_ms > 0:
            throughput = round((bytes_for_rate * 8) / (duration_ms / 1000) / 1_000_000, 3)
        normalized_raw = {
            key: self._value(value)
            for key, value in raw.items()
            if not key.startswith("_")
        }
        cpe_meaningful = bool(
            str(state or "") == "Completed"
            and max(test_bytes or 0, total_bytes or 0) > 0
        )
        if self._valid_server_evidence(evidence) and cpe_meaningful:
            source = "CPE_AND_SERVER"
        elif self._valid_server_evidence(evidence):
            source = "SERVER_EVIDENCE"
        else:
            source = "CPE"
        return DownloadResult(
            diagnostics_state=str(state) if state is not None else None,
            throughput_mbps=throughput,
            download_bytes=test_bytes,
            total_bytes_received=total_bytes,
            duration_ms=duration_ms,
            tcp_open_ms=tcp_open_ms,
            rom_time=rom,
            bom_time=bom,
            eom_time=eom,
            tcp_open_request_time=tcp_req,
            tcp_open_response_time=tcp_res,
            result_source=source,  # type: ignore[arg-type]
            server_evidence=evidence,
            raw=normalized_raw,
        )

    @staticmethod
    def _has_meaningful_cpe_result(result: DownloadResult) -> bool:
        return bool(
            result.diagnostics_state == "Completed"
            and max(result.download_bytes or 0, result.total_bytes_received or 0) > 0
            and result.duration_ms is not None
            and result.duration_ms > 0
        )

    @staticmethod
    def _valid_server_evidence(evidence: ServerEvidence | None) -> bool:
        return bool(
            evidence
            and evidence.observed
            and evidence.http_status is not None
            and 200 <= evidence.http_status < 300
            and (evidence.bytes_sent or 0) > 0
        )

    @staticmethod
    def _with_execution_id(url: str, execution_id: UUID) -> str:
        parts = urlsplit(url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query["execution"] = str(execution_id)
        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )

    @staticmethod
    def _extract_object(device: dict[str, Any], dotted_path: str) -> dict[str, Any]:
        current: Any = device
        for segment in dotted_path.split("."):
            if not isinstance(current, dict):
                return {}
            current = current.get(segment)
        return current if isinstance(current, dict) else {}

    @staticmethod
    def _value(value: Any) -> Any:
        if isinstance(value, dict) and "_value" in value:
            return value.get("_value")
        return value

    @staticmethod
    def _parse_time(value: Any) -> datetime | None:
        if value in (None, "", "0001-01-01T00:00:00Z"):
            return None
        if isinstance(value, datetime):
            return value
        text = str(value).strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(text)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None

    @staticmethod
    def _as_int(value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _delta_ms(start: datetime | None, end: datetime | None) -> float | None:
        if not start or not end:
            return None
        return round((end - start).total_seconds() * 1000, 3)


service = TR143DownloadService()
