from __future__ import annotations

import statistics
from typing import Any

from sqlalchemy.orm import Session

from app.modules.device_diagnostics.repository import get_job as get_diagnostic_job

from . import repository

POLICY_CODE = "TR143_DEFAULT_V1"
POLICY_VERSION = "EUREKA36.6.1"

DEFAULT_RULES = [
    {
        "code": "PING_COMPLETED",
        "label": "Ping completato",
        "weight": 15,
        "category": "CONNECTIVITY",
    },
    {
        "code": "DOWNLOAD_SUPPORTED",
        "label": "TR-143 Download eseguito",
        "weight": 20,
        "category": "SUPPORT",
    },
    {
        "code": "DOWNLOAD_SUCCESS_RATIO",
        "label": "Affidabilita esecuzione download",
        "weight": 20,
        "category": "RELIABILITY",
    },
    {
        "code": "TIMING_AVAILABLE",
        "label": "Timing TR-143 disponibile",
        "weight": 10,
        "category": "EVIDENCE",
    },
    {
        "code": "TCP_METRICS_AVAILABLE",
        "label": "Metriche TCP disponibili",
        "weight": 10,
        "category": "EVIDENCE",
    },
    {
        "code": "THROUGHPUT_CONSISTENCY",
        "label": "Coerenza throughput tra ripetizioni",
        "weight": 15,
        "category": "CONSISTENCY",
    },
    {
        "code": "BYTE_ACCOUNTING_RELIABILITY",
        "label": "Affidabilita contabilizzazione byte",
        "weight": 10,
        "category": "ACCOUNTING",
    },
]



TERMINAL_JOB_STATUSES = {"COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"}


def _download_metrics_from_job(job: dict[str, Any], expected_size: int | None) -> dict[str, Any]:
    result = job.get("result") or {}
    test_bytes = result.get("test_bytes_received")
    efficiency = None
    if expected_size and test_bytes is not None:
        efficiency = round((float(test_bytes) / float(expected_size)) * 100.0, 2)
    return {
        "throughput_mbps": result.get("throughput_mbps"),
        "duration_ms": result.get("duration_ms"),
        "test_bytes_received": test_bytes,
        "total_bytes_received": result.get("total_bytes_received"),
        "tcp_open_ms": result.get("tcp_open_ms"),
        "expected_size_bytes": expected_size,
        "byte_efficiency_percent": efficiency,
        "url": result.get("download_url") or result.get("requested_url"),
        "raw_state": result.get("raw_state"),
        "adapter": result.get("adapter"),
    }


def reconcile_steps_from_bound_jobs(db: Session, run: dict[str, Any]) -> dict[str, Any]:
    """Refresh qualification step state only from its own diagnostic_job_id.

    This deliberately never searches by device_id or by latest job. It makes repeated
    qualification runs deterministic and repairs stale step rows before evaluation.
    """
    for step in run.get("steps") or []:
        job_id = step.get("diagnostic_job_id")
        if not job_id:
            continue
        job = get_diagnostic_job(db, job_id)
        if not job:
            continue
        job_status = str(job.get("status") or "").upper()
        if job_status == "COMPLETED":
            result = job.get("result") or {}
            metrics = (
                _download_metrics_from_job(job, step.get("expected_size_bytes"))
                if step.get("step_type") == "TR143_DOWNLOAD"
                else result
            )
            if step.get("status") != "COMPLETED" or not (step.get("metrics") or {}):
                repository.update_step(
                    db, step["id"], status="COMPLETED", progress=100,
                    metrics=metrics, raw_result=result, error={}, completed_at=True,
                )
        elif job_status in TERMINAL_JOB_STATUSES and step.get("status") not in TERMINAL_JOB_STATUSES:
            repository.update_step(
                db, step["id"], status=job_status, progress=100,
                raw_result=job.get("result") or {}, error=job.get("error") or {},
                completed_at=True,
            )
    return repository.get_run(db, run["id"]) or run

def _rating(score: int) -> str:
    if score >= 90:
        return "FULLY_QUALIFIED"
    if score >= 75:
        return "QUALIFIED"
    if score >= 55:
        return "PARTIAL"
    if score >= 25:
        return "LIMITED"
    return "NOT_SUPPORTED"


def _evidence(
    code: str,
    label: str,
    weight: int,
    passed: bool,
    value: Any,
    reason: str,
    category: str,
    awarded: float | None = None,
) -> dict[str, Any]:
    points = float(weight if passed else 0) if awarded is None else max(0.0, min(float(weight), float(awarded)))
    return {
        "code": code,
        "label": label,
        "category": category,
        "weight": weight,
        "passed": bool(passed),
        "value": value,
        "reason": reason,
        "awarded_points": round(points, 2),
    }


def evaluate_steps(steps: list[dict[str, Any]]) -> tuple[int, str, dict[str, Any], list[dict[str, Any]]]:
    pings = [step for step in steps if step.get("step_type") == "PING"]
    downloads = [step for step in steps if step.get("step_type") == "TR143_DOWNLOAD"]
    completed_downloads = [step for step in downloads if step.get("status") == "COMPLETED"]
    failed_downloads = [step for step in downloads if step.get("status") in {"FAILED", "CANCELLED", "TIMED_OUT"}]
    incomplete_downloads = [step for step in downloads if step.get("status") not in {"COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"}]

    throughputs = [
        float((step.get("metrics") or {}).get("throughput_mbps"))
        for step in completed_downloads
        if (step.get("metrics") or {}).get("throughput_mbps") is not None
    ]
    efficiencies = [
        float((step.get("metrics") or {}).get("byte_efficiency_percent"))
        for step in completed_downloads
        if (step.get("metrics") or {}).get("byte_efficiency_percent") is not None
    ]
    durations = [
        float((step.get("metrics") or {}).get("duration_ms"))
        for step in completed_downloads
        if (step.get("metrics") or {}).get("duration_ms") is not None
    ]
    tcp_open_values = [
        float((step.get("metrics") or {}).get("tcp_open_ms"))
        for step in completed_downloads
        if (step.get("metrics") or {}).get("tcp_open_ms") is not None
    ]

    ping_completed = any(step.get("status") == "COMPLETED" for step in pings)
    download_supported = bool(completed_downloads)
    success_ratio = (len(completed_downloads) / len(downloads)) if downloads else 0.0

    consistency_ratio = 0.0
    coefficient_variation = None
    if len(throughputs) >= 2 and statistics.mean(throughputs) > 0:
        coefficient_variation = statistics.pstdev(throughputs) / statistics.mean(throughputs)
        consistency_ratio = max(0.0, 1.0 - min(coefficient_variation, 1.0))
    elif len(throughputs) == 1:
        consistency_ratio = 0.5

    byte_reliability_ratio = 0.0
    if efficiencies:
        # Firmware vendor may expose partial byte counters. This rule records reliability
        # without treating partial accounting as failure of DownloadDiagnostics itself.
        mean_efficiency = statistics.mean(efficiencies)
        byte_reliability_ratio = max(0.0, 1.0 - min(abs(100.0 - mean_efficiency) / 100.0, 1.0))
    else:
        mean_efficiency = None

    evidence = [
        _evidence(
            "PING_COMPLETED", "Ping completato", 15, ping_completed,
            {"completed": ping_completed},
            "Ping diagnostico completato." if ping_completed else "Ping non completato.",
            "CONNECTIVITY",
        ),
        _evidence(
            "DOWNLOAD_SUPPORTED", "TR-143 Download eseguito", 20, download_supported,
            {"completed_downloads": len(completed_downloads)},
            "Il CPE completa DownloadDiagnostics." if download_supported else "Nessun download completato.",
            "SUPPORT",
        ),
        _evidence(
            "DOWNLOAD_SUCCESS_RATIO", "Affidabilita esecuzione download", 20,
            success_ratio >= 0.75,
            {"success_ratio_percent": round(success_ratio * 100, 2)},
            f"{len(completed_downloads)}/{len(downloads)} download completati.",
            "RELIABILITY",
            awarded=20 * success_ratio,
        ),
        _evidence(
            "TIMING_AVAILABLE", "Timing TR-143 disponibile", 10, bool(durations),
            {"samples": len(durations)},
            "Duration disponibile nei risultati." if durations else "Timing non disponibile.",
            "EVIDENCE",
        ),
        _evidence(
            "TCP_METRICS_AVAILABLE", "Metriche TCP disponibili", 10, bool(tcp_open_values),
            {"samples": len(tcp_open_values)},
            "TCP open time disponibile." if tcp_open_values else "TCP open time non disponibile.",
            "EVIDENCE",
        ),
        _evidence(
            "THROUGHPUT_CONSISTENCY", "Coerenza throughput tra ripetizioni", 15,
            consistency_ratio >= 0.65,
            {
                "consistency_percent": round(consistency_ratio * 100, 2),
                "coefficient_variation": round(coefficient_variation, 4) if coefficient_variation is not None else None,
            },
            "Throughput stabile." if consistency_ratio >= 0.65 else "Throughput variabile tra le ripetizioni.",
            "CONSISTENCY",
            awarded=15 * consistency_ratio,
        ),
        _evidence(
            "BYTE_ACCOUNTING_RELIABILITY", "Affidabilita contabilizzazione byte", 10,
            byte_reliability_ratio >= 0.8,
            {
                "average_byte_efficiency_percent": round(mean_efficiency, 2) if mean_efficiency is not None else None,
                "reliability_percent": round(byte_reliability_ratio * 100, 2),
            },
            "Contatori byte coerenti." if byte_reliability_ratio >= 0.8 else "Contatori byte vendor-specific o parziali; il supporto download resta separato.",
            "ACCOUNTING",
            awarded=10 * byte_reliability_ratio,
        ),
    ]

    integrity_ok = not incomplete_downloads
    evidence.append(_evidence(
        "SUMMARY_INTEGRITY",
        "Integrita riepilogo qualification",
        0,
        integrity_ok,
        {
            "download_steps": len(downloads),
            "completed": len(completed_downloads),
            "failed": len(failed_downloads),
            "incomplete": len(incomplete_downloads),
            "bound_job_ids": [step.get("diagnostic_job_id") for step in downloads],
        },
        "Tutti gli step terminali sono stati ricostruiti dai job associati alla run."
        if integrity_ok else
        "Sono presenti step non terminali: il riepilogo non deve essere interpretato come definitivo.",
        "INTEGRITY",
    ))

    score = int(round(sum(item["awarded_points"] for item in evidence)))
    rating = _rating(score)
    summary = {
        "policy_code": POLICY_CODE,
        "policy_version": POLICY_VERSION,
        "download_steps": len(downloads),
        "completed_download_steps": len(completed_downloads),
        "failed_download_steps": len(failed_downloads),
        "incomplete_download_steps": len(incomplete_downloads),
        "summary_integrity": "COMPLETE" if not incomplete_downloads else "INCOMPLETE",
        "download_step_statuses": [
            {
                "sequence": step.get("sequence"),
                "status": step.get("status"),
                "diagnostic_job_id": step.get("diagnostic_job_id"),
                "error": step.get("error") or {},
            }
            for step in downloads
        ],
        "success_ratio_percent": round(success_ratio * 100, 2),
        "average_throughput_mbps": round(statistics.mean(throughputs), 2) if throughputs else None,
        "maximum_throughput_mbps": round(max(throughputs), 2) if throughputs else None,
        "minimum_throughput_mbps": round(min(throughputs), 2) if throughputs else None,
        "throughput_stddev_mbps": round(statistics.pstdev(throughputs), 2) if len(throughputs) > 1 else 0 if throughputs else None,
        "throughput_consistency_percent": round(consistency_ratio * 100, 2),
        "average_byte_efficiency_percent": round(mean_efficiency, 2) if mean_efficiency is not None else None,
        "byte_accounting_reliable": byte_reliability_ratio >= 0.8,
        "upload_qualified": False,
        "findings": [item["reason"] for item in evidence if not item["passed"]],
    }
    return score, rating, summary, evidence


def evaluate_and_persist(db: Session, run: dict[str, Any]) -> dict[str, Any]:
    run = reconcile_steps_from_bound_jobs(db, run)
    score, rating, summary, evidence = evaluate_steps(run.get("steps") or [])
    repository.replace_evidence(db, run["id"], evidence)
    repository.update_run(db, run["id"], score=score, rating=rating, summary=summary)
    return {
        "score": score,
        "rating": rating,
        "summary": summary,
        "evidence": evidence,
    }
