from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.device_diagnostics.runner import run_job
from app.modules.device_diagnostics.service import create_job as create_diagnostic_job
from app.modules.device_diagnostics.repository import get_job as get_diagnostic_job
from app.modules.diagnostic_servers.service import list_servers, resolve_download_url

from . import repository
from .policy import evaluate_and_persist


TERMINAL = {'COMPLETED','FAILED','CANCELLED','TIMED_OUT'}


def create_qualification(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    run=repository.create_run(db,payload)
    servers=list_servers(db,include_disabled=False)
    selected_servers=[s for s in servers if not payload.get('server_ids') or s['id'] in payload['server_ids']]
    sequence=1
    if payload.get('include_ping',True):
        repository.add_step(db,run['id'],sequence,{'step_type':'PING','target':payload.get('ping_target','8.8.8.8')}); sequence+=1
    for server in selected_servers:
        if server.get('server_type') != 'TR143_HTTP': continue
        files=[f for f in server.get('files',[]) if not payload.get('file_ids') or f['id'] in payload['file_ids']]
        for _ in range(int(payload.get('repetitions',3))):
            for file_item in files:
                resolved=resolve_download_url(db,server_id=server['id'],file_id=file_item['id'])
                repository.add_step(db,run['id'],sequence,{
                    'step_type':'TR143_DOWNLOAD','server_id':server['id'],'file_id':file_item['id'],
                    'target':resolved['url'],'expected_size_bytes':resolved.get('expected_size_bytes')
                }); sequence+=1
    return repository.get_run(db,run['id']) or run


def _metrics(job: dict[str,Any], expected_size: int | None) -> dict[str,Any]:
    result=job.get('result') or {}
    duration_ms=result.get('duration_ms')
    test_bytes=result.get('test_bytes_received')
    total_bytes=result.get('total_bytes_received')
    throughput=result.get('throughput_mbps')
    tcp_open=result.get('tcp_open_ms')
    efficiency=None
    if expected_size and test_bytes is not None:
        efficiency=round((float(test_bytes)/float(expected_size))*100,2)
    return {
        'throughput_mbps':throughput,
        'duration_ms':duration_ms,
        'test_bytes_received':test_bytes,
        'total_bytes_received':total_bytes,
        'tcp_open_ms':tcp_open,
        'expected_size_bytes':expected_size,
        'byte_efficiency_percent':efficiency,
        'url':result.get('download_url') or result.get('requested_url'),
        'raw_state':result.get('raw_state'),
        'adapter':result.get('adapter'),
    }



async def execute_qualification(run_id: str, resume: bool = False) -> None:
    db = SessionLocal()
    try:
        run = repository.get_run(db, run_id)
        if not run:
            return
        if run.get('status') == 'CANCELLED':
            return

        repository.update_run(db, run_id, status='RUNNING', progress=max(int(run.get('progress') or 0), 1), started_at=True)
        run = repository.get_run(db, run_id) or run
        steps = run.get('steps') or []
        total = max(len(steps), 1)

        for index, step in enumerate(steps):
            current_run = repository.get_run(db, run_id) or {}
            if current_run.get('status') == 'CANCELLED':
                return
            if resume and step.get('status') == 'COMPLETED':
                repository.update_run(db, run_id, progress=round(((index + 1) / total) * 95))
                continue

            repository.update_step(db, step['id'], status='RUNNING', progress=10, started_at=True)
            if step['step_type'] == 'PING':
                diagnostic_type = 'PING'
                params = {
                    'host': step['target'], 'target': step['target'],
                    'repetitions': 10, 'timeout_ms': 5000,
                    'source': 'EUREKA36.5.1_QUALIFICATION',
                }
                timeout = 60
            else:
                diagnostic_type = 'TR143_SPEEDTEST'
                params = {
                    'diagnostic_server_id': step.get('server_id'),
                    'diagnostic_file_id': step.get('file_id'),
                    'url': step.get('target'),
                    'mode': 'DOWNLOAD_ONLY',
                    'source': 'EUREKA36.5.1_QUALIFICATION',
                }
                timeout = 360

            job = create_diagnostic_job(db, {
                'device_id': run['device_id'],
                'diagnostic_type': diagnostic_type,
                'parameters': params,
                'timeout_seconds': timeout,
                'requested_by': run.get('requested_by') or 'TR143 Qualification Suite',
            })
            repository.update_step(db, step['id'], diagnostic_job_id=job['id'], progress=20)
            await run_job(job['id'])
            final = get_diagnostic_job(db, job['id']) or job

            if final.get('status') == 'COMPLETED':
                metrics = _metrics(final, step.get('expected_size_bytes')) if step['step_type'] == 'TR143_DOWNLOAD' else (final.get('result') or {})
                repository.update_step(
                    db, step['id'], status='COMPLETED', progress=100,
                    metrics=metrics, raw_result=final.get('result') or {}, completed_at=True,
                )
            else:
                repository.update_step(
                    db, step['id'], status=final.get('status') or 'FAILED', progress=100,
                    error=final.get('error') or {}, raw_result=final.get('result') or {}, completed_at=True,
                )
            repository.update_run(db, run_id, progress=round(((index + 1) / total) * 95))

        final_run = repository.get_run(db, run_id) or {}
        if final_run.get('status') == 'CANCELLED':
            return
        evaluation = evaluate_and_persist(db, final_run)
        repository.update_run(
            db, run_id, status='COMPLETED', progress=100,
            score=evaluation['score'], rating=evaluation['rating'],
            summary=evaluation['summary'], completed_at=True,
        )
    except Exception as exc:
        db.rollback()
        repository.update_run(
            db, run_id, status='FAILED', progress=100,
            error={'code': exc.__class__.__name__, 'message': str(exc)}, completed_at=True,
        )
    finally:
        db.close()
