from __future__ import annotations

from .schemas import DownloadResult, ValidationCheck, ValidationResult


class TR143Validator:
    """Validate CPE metrics and independent HTTP server evidence."""

    def validate(self, result: DownloadResult) -> ValidationResult:
        checks: list[ValidationCheck] = []
        warnings: list[str] = []
        errors: list[str] = []
        score = 100

        evidence = result.server_evidence
        server_ok = bool(
            evidence
            and evidence.observed
            and evidence.http_status is not None
            and 200 <= evidence.http_status < 300
            and (evidence.bytes_sent or 0) > 0
        )
        checks.append(
            ValidationCheck(
                code="SERVER_EVIDENCE",
                label="HTTP download observed by diagnostic server",
                status="PASS" if server_ok else "NOT_AVAILABLE",
                detail=(
                    f"HTTP {evidence.http_status}, {evidence.bytes_sent} bytes, source {evidence.source_ip}"
                    if evidence and evidence.observed
                    else "No correlated HTTP request found"
                ),
            )
        )

        state_ok = result.diagnostics_state == "Completed"
        checks.append(
            ValidationCheck(
                code="DIAGNOSTICS_STATE",
                label="CPE diagnostic state",
                status="PASS" if state_ok else ("WARNING" if server_ok else "FAIL"),
                score_delta=0 if state_ok else (-10 if server_ok else -50),
                detail=result.diagnostics_state or "Missing DiagnosticsState",
            )
        )
        if not state_ok:
            if server_ok:
                score -= 10
                warnings.append(
                    f"CPE reported {result.diagnostics_state or 'no state'}, but the server verified the download"
                )
            else:
                score -= 50
                errors.append(
                    f"CPE diagnostic state is {result.diagnostics_state or 'missing'}, expected Completed"
                )

        test_bytes = result.download_bytes or 0
        total_bytes = result.total_bytes_received or 0
        cpe_bytes_ok = max(test_bytes, total_bytes) > 0
        checks.append(
            ValidationCheck(
                code="CPE_BYTES_RECEIVED",
                label="Payload bytes reported by CPE",
                status="PASS" if cpe_bytes_ok else ("WARNING" if server_ok else "FAIL"),
                score_delta=0 if cpe_bytes_ok else (-10 if server_ok else -30),
                detail=f"test={test_bytes}, total={total_bytes}",
            )
        )
        if not cpe_bytes_ok:
            if server_ok:
                score -= 10
                warnings.append(
                    "The firmware did not update TR-143 byte counters; server-side transfer evidence is authoritative"
                )
            else:
                score -= 30
                errors.append("No payload bytes were reported by either CPE or diagnostic server")

        duration_ok = result.duration_ms is not None and result.duration_ms > 0
        checks.append(
            ValidationCheck(
                code="TRANSFER_DURATION",
                label="CPE transfer duration",
                status="PASS" if duration_ok else ("WARNING" if server_ok else "NOT_AVAILABLE"),
                score_delta=0 if duration_ok else (-5 if server_ok else -20),
                detail=f"{result.duration_ms} ms" if result.duration_ms is not None else "Unavailable",
            )
        )
        if not duration_ok:
            score -= 5 if server_ok else 20
            warnings.append("CPE transfer duration is missing or invalid")

        tcp_available = result.tcp_open_ms is not None
        tcp_ok = tcp_available and result.tcp_open_ms >= 0
        checks.append(
            ValidationCheck(
                code="TCP_TIMESTAMPS",
                label="CPE TCP open timestamps",
                status="PASS" if tcp_ok else ("WARNING" if server_ok else "NOT_AVAILABLE"),
                score_delta=0 if tcp_ok else (-5 if server_ok else -20),
                detail=f"{result.tcp_open_ms} ms" if tcp_available else "Unavailable",
            )
        )
        if not tcp_ok:
            score -= 5 if server_ok else (20 if tcp_available else 0)
            warnings.append("CPE TCP timestamps are missing or inconsistent")

        score = max(0, min(100, score))
        if server_ok:
            status = "WARNING" if warnings else "VALID"
        elif errors:
            status = "INVALID"
        elif warnings:
            status = "WARNING"
        else:
            status = "VALID"

        return ValidationResult(
            status=status,
            score=score,
            checks=checks,
            warnings=warnings,
            errors=errors,
        )
