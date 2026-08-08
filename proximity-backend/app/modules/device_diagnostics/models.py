from __future__ import annotations

from enum import StrEnum


class DiagnosticJobStatus(StrEnum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    REQUESTED = "REQUESTED"
    RUNNING = "RUNNING"
    COLLECTING = "COLLECTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMED_OUT = "TIMED_OUT"


TERMINAL_STATUSES = {
    DiagnosticJobStatus.COMPLETED,
    DiagnosticJobStatus.FAILED,
    DiagnosticJobStatus.CANCELLED,
    DiagnosticJobStatus.TIMED_OUT,
}

ALLOWED_TRANSITIONS = {
    DiagnosticJobStatus.CREATED: {
        DiagnosticJobStatus.QUEUED,
        DiagnosticJobStatus.CANCELLED,
        DiagnosticJobStatus.FAILED,
    },
    DiagnosticJobStatus.QUEUED: {
        DiagnosticJobStatus.REQUESTED,
        DiagnosticJobStatus.RUNNING,
        DiagnosticJobStatus.CANCELLED,
        DiagnosticJobStatus.FAILED,
        DiagnosticJobStatus.TIMED_OUT,
    },
    DiagnosticJobStatus.REQUESTED: {
        DiagnosticJobStatus.RUNNING,
        DiagnosticJobStatus.COLLECTING,
        DiagnosticJobStatus.CANCELLED,
        DiagnosticJobStatus.FAILED,
        DiagnosticJobStatus.TIMED_OUT,
    },
    DiagnosticJobStatus.RUNNING: {
        DiagnosticJobStatus.COLLECTING,
        DiagnosticJobStatus.COMPLETED,
        DiagnosticJobStatus.CANCELLED,
        DiagnosticJobStatus.FAILED,
        DiagnosticJobStatus.TIMED_OUT,
    },
    DiagnosticJobStatus.COLLECTING: {
        DiagnosticJobStatus.COMPLETED,
        DiagnosticJobStatus.CANCELLED,
        DiagnosticJobStatus.FAILED,
        DiagnosticJobStatus.TIMED_OUT,
    },
}
