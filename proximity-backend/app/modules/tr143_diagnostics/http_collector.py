from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from .schemas import ServerEvidence

# Supports the current Nginx combined-like format:
# 145.79.192.143 - - [29/Jul/2026:19:18:56 +0000] "GET /download/100MB.bin?... HTTP/1.1" 200 104857600 ...
LOG_PATTERN = re.compile(
    r'^(?P<ip>\S+)\s+\S+\s+\S+\s+\[(?P<time>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<target>\S+)\s+HTTP/[^"]+"\s+'
    r'(?P<status>\d{3})\s+(?P<bytes>\d+|-)'
)


class NginxDiagnosticLogCollector:
    def __init__(self, log_path: str | None = None, tail_bytes: int | None = None) -> None:
        self.log_path = Path(
            log_path
            or os.getenv(
                "DIAGNOSTIC_NGINX_ACCESS_LOG",
                "/var/log/nginx/proximity-diagnostics-access.log",
            )
        )
        self.tail_bytes = tail_bytes or int(
            os.getenv("DIAGNOSTIC_LOG_SCAN_BYTES", "2097152")
        )

    def find_execution(self, execution_id: UUID, started_at: datetime) -> ServerEvidence | None:
        if not self.log_path.is_file() or not os.access(self.log_path, os.R_OK):
            return None

        marker = str(execution_id)
        for line in reversed(self._tail_lines()):
            if marker not in line:
                continue
            match = LOG_PATTERN.match(line)
            if not match:
                continue
            target = match.group("target")
            query = parse_qs(urlsplit(target).query)
            if marker not in query.get("execution", []):
                continue
            observed_at = self._parse_nginx_time(match.group("time"))
            if observed_at and observed_at < started_at.astimezone(timezone.utc):
                continue
            status = int(match.group("status"))
            bytes_sent = 0 if match.group("bytes") == "-" else int(match.group("bytes"))
            return ServerEvidence(
                observed=True,
                source_ip=match.group("ip"),
                request_target=target,
                http_status=status,
                bytes_sent=bytes_sent,
                observed_at=observed_at,
                execution_id=execution_id,
                log_path=str(self.log_path),
            )
        return None

    def readable(self) -> bool:
        return self.log_path.is_file() and os.access(self.log_path, os.R_OK)

    def _tail_lines(self) -> list[str]:
        size = self.log_path.stat().st_size
        with self.log_path.open("rb") as handle:
            handle.seek(max(0, size - self.tail_bytes))
            data = handle.read()
        return data.decode("utf-8", errors="replace").splitlines()

    @staticmethod
    def _parse_nginx_time(value: str) -> datetime | None:
        try:
            return datetime.strptime(value, "%d/%b/%Y:%H:%M:%S %z")
        except ValueError:
            return None
