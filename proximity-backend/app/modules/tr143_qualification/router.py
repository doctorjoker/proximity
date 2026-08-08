from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db

from . import repository
from .schemas import QualificationRunControl, QualificationRunCreate
from .service import create_qualification, execute_qualification
from .policy import DEFAULT_RULES, POLICY_CODE, POLICY_VERSION, evaluate_and_persist

router=APIRouter(prefix='/api/v1/tr143-qualification',tags=['TR-143 Qualification Suite'])


@router.get('/engine')
def engine():
    return {'success':True,'engine':'TR-143 Qualification Suite','version':'EUREKA36.7.0','ratings':['FULLY_QUALIFIED','QUALIFIED','PARTIAL','LIMITED','NOT_SUPPORTED']}


@router.post('/runs',status_code=202)
def create_run(payload: QualificationRunCreate, background_tasks: BackgroundTasks, db: Session=Depends(get_db)):
    try:
        run=create_qualification(db,payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400,detail=str(exc)) from exc
    background_tasks.add_task(execute_qualification,run['id'])
    return {'success':True,'run':run}


@router.get('/runs')
def list_runs(device_id: UUID|None=None,limit:int=Query(default=20,ge=1,le=100),db:Session=Depends(get_db)):
    return {'success':True,'items':repository.list_runs(db,str(device_id) if device_id else None,limit)}


@router.get('/runs/{run_id}')
def get_run(run_id: UUID,db:Session=Depends(get_db)):
    run=repository.get_run(db,str(run_id))
    if not run: raise HTTPException(status_code=404,detail='Qualification run not found')
    return {'success':True,'run':run}


@router.post('/runs/{run_id}/start', status_code=202)
def start_run(run_id: UUID, payload: QualificationRunControl, background_tasks: BackgroundTasks, db: Session=Depends(get_db)):
    run=repository.get_run(db,str(run_id))
    if not run:
        raise HTTPException(status_code=404,detail='Qualification run not found')
    if run.get('status') == 'RUNNING' and not payload.force:
        raise HTTPException(status_code=409,detail='Qualification run already running')
    prepared=repository.reset_run_for_resume(db,str(run_id),force=payload.force)
    background_tasks.add_task(execute_qualification,str(run_id),False)
    return {'success':True,'run':prepared}


@router.post('/runs/{run_id}/resume', status_code=202)
def resume_run(run_id: UUID, payload: QualificationRunControl, background_tasks: BackgroundTasks, db: Session=Depends(get_db)):
    run=repository.get_run(db,str(run_id))
    if not run:
        raise HTTPException(status_code=404,detail='Qualification run not found')
    if run.get('status') == 'RUNNING' and not payload.force:
        raise HTTPException(status_code=409,detail='Qualification run already running')
    prepared=repository.reset_run_for_resume(db,str(run_id),force=False)
    background_tasks.add_task(execute_qualification,str(run_id),True)
    return {'success':True,'run':prepared}


@router.post('/runs/{run_id}/cancel')
def cancel_run(run_id: UUID, payload: QualificationRunControl, db: Session=Depends(get_db)):
    run=repository.cancel_run(db,str(run_id),payload.reason)
    if not run:
        raise HTTPException(status_code=404,detail='Qualification run not found')
    return {'success':True,'run':run}


@router.get('/policy')
def get_policy():
    return {
        'success': True,
        'policy': {
            'code': POLICY_CODE,
            'version': POLICY_VERSION,
            'rules': DEFAULT_RULES,
        },
    }


@router.post('/runs/{run_id}/evaluate')
def evaluate_run(run_id: UUID, db: Session=Depends(get_db)):
    run=repository.get_run(db,str(run_id))
    if not run:
        raise HTTPException(status_code=404,detail='Qualification run not found')
    evaluation=evaluate_and_persist(db,run)
    return {'success':True,'evaluation':evaluation,'run':repository.get_run(db,str(run_id))}


@router.get('/runs/{run_id}/evidence')
def get_run_evidence(run_id: UUID, db: Session=Depends(get_db)):
    run=repository.get_run(db,str(run_id))
    if not run:
        raise HTTPException(status_code=404,detail='Qualification run not found')
    return {'success':True,'items':repository.list_evidence(db,str(run_id))}


@router.get('/devices/{device_id}/dashboard')
def qualification_dashboard(device_id: UUID, db: Session=Depends(get_db)):
    latest=repository.latest_run_for_device(db,str(device_id))
    if not latest:
        return {'success':True,'device_id':str(device_id),'latest':None,'evidence':[]}
    evidence=repository.list_evidence(db,latest['id'])
    ping=next((step for step in latest.get('steps',[]) if step.get('step_type')=='PING'),None)
    downloads=[step for step in latest.get('steps',[]) if step.get('step_type')=='TR143_DOWNLOAD' and step.get('status')=='COMPLETED']
    best=max(downloads,key=lambda step: float((step.get('metrics') or {}).get('throughput_mbps') or 0),default=None)
    return {
        'success':True,
        'device_id':str(device_id),
        'latest':latest,
        'evidence':evidence,
        'cards':{
            'qualification':{'score':latest.get('score'),'rating':latest.get('rating'),'completed_at':latest.get('completed_at')},
            'ping':(ping.get('metrics') if ping else None),
            'speedtest':({
                'throughput_mbps':(best.get('metrics') or {}).get('throughput_mbps'),
                'target':best.get('target'),
                'duration_ms':(best.get('metrics') or {}).get('duration_ms'),
            } if best else None),
        },
    }



@router.get('/devices/{device_id}/history')
def qualification_history(
    device_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return {
        'success': True,
        'device_id': str(device_id),
        'items': repository.qualification_history_for_device(db, str(device_id), limit),
    }


@router.get('/runs/{run_id}/report')
def qualification_report(run_id: UUID, db: Session = Depends(get_db)):
    run = repository.get_run(db, str(run_id))
    if not run:
        raise HTTPException(status_code=404, detail='Qualification run not found')

    evidence = repository.list_evidence(db, str(run_id))
    ping = next((step for step in run.get('steps', []) if step.get('step_type') == 'PING'), None)
    downloads = [
        step for step in run.get('steps', [])
        if step.get('step_type') == 'TR143_DOWNLOAD'
    ]

    throughput_series = []
    for step in downloads:
        metrics = step.get('metrics') or {}
        throughput_series.append({
            'sequence': step.get('sequence'),
            'server_id': step.get('server_id'),
            'file_id': step.get('file_id'),
            'target': step.get('target'),
            'expected_size_bytes': step.get('expected_size_bytes'),
            'status': step.get('status'),
            'throughput_mbps': metrics.get('throughput_mbps'),
            'duration_ms': metrics.get('duration_ms'),
            'tcp_open_ms': metrics.get('tcp_open_ms'),
            'test_bytes_received': metrics.get('test_bytes_received'),
            'total_bytes_received': metrics.get('total_bytes_received'),
            'byte_efficiency_percent': metrics.get('byte_efficiency_percent'),
        })

    return {
        'success': True,
        'version': 'EUREKA36.7.0',
        'report': {
            'run_id': str(run_id),
            'device_id': run.get('device_id'),
            'status': run.get('status'),
            'score': run.get('score'),
            'rating': run.get('rating'),
            'firmware_version': run.get('firmware_version'),
            'policy_code': (run.get('summary') or {}).get('policy_code'),
            'policy_version': (run.get('summary') or {}).get('policy_version'),
            'started_at': run.get('started_at'),
            'completed_at': run.get('completed_at'),
            'summary': run.get('summary') or {},
            'findings': (run.get('summary') or {}).get('findings') or [],
            'ping': ping,
            'downloads': throughput_series,
            'evidence': evidence,
            'raw': run,
        },
    }
