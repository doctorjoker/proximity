from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tr143_qualification_runs (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    progress INTEGER NOT NULL DEFAULT 0,
    score INTEGER NULL,
    rating VARCHAR(40) NULL,
    firmware_version TEXT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_by VARCHAR(160) NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tr143_qualification_steps (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES tr143_qualification_runs(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    step_type VARCHAR(80) NOT NULL,
    diagnostic_job_id UUID NULL REFERENCES device_diagnostic_jobs(id) ON DELETE SET NULL,
    server_id BIGINT NULL REFERENCES diagnostic_servers(id) ON DELETE SET NULL,
    file_id BIGINT NULL REFERENCES diagnostic_server_files(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    progress INTEGER NOT NULL DEFAULT 0,
    target TEXT NULL,
    expected_size_bytes BIGINT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    error JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_tr143_qualification_runs_device
    ON tr143_qualification_runs(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr143_qualification_steps_run
    ON tr143_qualification_steps(run_id, sequence);


CREATE TABLE IF NOT EXISTS tr143_qualification_evidence (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES tr143_qualification_runs(id) ON DELETE CASCADE,
    code VARCHAR(120) NOT NULL,
    label VARCHAR(240) NOT NULL,
    category VARCHAR(80) NOT NULL,
    weight NUMERIC(8,2) NOT NULL DEFAULT 0,
    awarded_points NUMERIC(8,2) NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tr143_qualification_evidence_run
    ON tr143_qualification_evidence(run_id, category, code);
"""


def _json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def _serialize(value: Any) -> Any:
    if isinstance(value, (UUID, datetime)):
        return str(value) if isinstance(value, UUID) else value.isoformat()
    return value


def _row(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    item = dict(row._mapping if hasattr(row, '_mapping') else row)
    for key, value in list(item.items()):
        item[key] = _serialize(value)
    for key in ('parameters', 'summary', 'error', 'metrics', 'raw_result'):
        if key in item and item[key] is None:
            item[key] = {}
    return item


def ensure_schema(db: Session) -> None:
    for statement in [part.strip() for part in SCHEMA_SQL.split(';') if part.strip()]:
        db.execute(text(statement))
    db.commit()


def create_run(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    ensure_schema(db)
    run_id = uuid4()
    row = db.execute(text("""
        INSERT INTO tr143_qualification_runs
            (id, device_id, parameters, requested_by)
        VALUES
            (:id, :device_id, CAST(:parameters AS jsonb), :requested_by)
        RETURNING *
    """), {
        'id': str(run_id),
        'device_id': str(payload['device_id']),
        'parameters': _json(payload),
        'requested_by': payload.get('requested_by'),
    }).mappings().first()
    db.commit()
    return _row(row) or {}


def add_step(db: Session, run_id: str, sequence: int, step: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(text("""
        INSERT INTO tr143_qualification_steps
            (id, run_id, sequence, step_type, server_id, file_id, target, expected_size_bytes)
        VALUES
            (:id, :run_id, :sequence, :step_type, :server_id, :file_id, :target, :expected_size_bytes)
        RETURNING *
    """), {
        'id': str(uuid4()), 'run_id': run_id, 'sequence': sequence,
        'step_type': step['step_type'], 'server_id': step.get('server_id'),
        'file_id': step.get('file_id'), 'target': step.get('target'),
        'expected_size_bytes': step.get('expected_size_bytes'),
    }).mappings().first()
    db.commit()
    return _row(row) or {}


def update_run(db: Session, run_id: str, **changes: Any) -> dict[str, Any] | None:
    allowed = {'status','progress','score','rating','firmware_version','summary','error','started_at','completed_at'}
    fields=[]; params={'id':run_id}
    for key,value in changes.items():
        if key not in allowed: continue
        if key in {'summary','error'}:
            fields.append(f"{key}=CAST(:{key} AS jsonb)"); params[key]=_json(value)
        elif key in {'started_at','completed_at'} and value is True:
            fields.append(f"{key}=NOW()")
        else:
            fields.append(f"{key}=:{key}"); params[key]=value
    if not fields: return get_run(db,run_id)
    fields.append('updated_at=NOW()')
    row=db.execute(text(f"UPDATE tr143_qualification_runs SET {', '.join(fields)} WHERE id=:id RETURNING *"),params).mappings().first()
    db.commit(); return _row(row)


def update_step(db: Session, step_id: str, **changes: Any) -> dict[str, Any] | None:
    allowed={'status','progress','diagnostic_job_id','metrics','raw_result','error','started_at','completed_at'}
    fields=[]; params={'id':step_id}
    for key,value in changes.items():
        if key not in allowed: continue
        if key in {'metrics','raw_result','error'}:
            fields.append(f"{key}=CAST(:{key} AS jsonb)"); params[key]=_json(value)
        elif key in {'started_at','completed_at'} and value is True:
            fields.append(f"{key}=NOW()")
        else:
            fields.append(f"{key}=:{key}"); params[key]=value
    fields.append('updated_at=NOW()')
    row=db.execute(text(f"UPDATE tr143_qualification_steps SET {', '.join(fields)} WHERE id=:id RETURNING *"),params).mappings().first()
    db.commit(); return _row(row)


def get_run(db: Session, run_id: str) -> dict[str, Any] | None:
    row=db.execute(text('SELECT * FROM tr143_qualification_runs WHERE id=:id'),{'id':run_id}).mappings().first()
    item=_row(row)
    if not item: return None
    steps=db.execute(text('SELECT * FROM tr143_qualification_steps WHERE run_id=:id ORDER BY sequence'),{'id':run_id}).mappings().all()
    item['steps']=[_row(step) for step in steps]
    return item


def list_runs(db: Session, device_id: str | None=None, limit: int=20) -> list[dict[str,Any]]:
    ensure_schema(db)
    where='WHERE device_id=:device_id' if device_id else ''
    params={'limit':max(1,min(limit,100))}
    if device_id: params['device_id']=device_id
    rows=db.execute(text(f'SELECT * FROM tr143_qualification_runs {where} ORDER BY created_at DESC LIMIT :limit'),params).mappings().all()
    return [_row(row) or {} for row in rows]


def reset_run_for_resume(db: Session, run_id: str, force: bool = False) -> dict[str, Any] | None:
    run = get_run(db, run_id)
    if not run:
        return None
    if run.get('status') == 'RUNNING' and not force:
        return run
    db.execute(text("""
        UPDATE tr143_qualification_runs
        SET status='CREATED', progress=0, score=NULL, rating=NULL,
            summary='{}'::jsonb, error='{}'::jsonb,
            started_at=NULL, completed_at=NULL, updated_at=NOW()
        WHERE id=:id
    """), {'id': run_id})
    db.execute(text("""
        UPDATE tr143_qualification_steps
        SET status='PENDING', progress=0, diagnostic_job_id=NULL,
            metrics='{}'::jsonb, raw_result='{}'::jsonb, error='{}'::jsonb,
            started_at=NULL, completed_at=NULL, updated_at=NOW()
        WHERE run_id=:id AND (status <> 'COMPLETED' OR :force)
    """), {'id': run_id, 'force': force})
    db.commit()
    return get_run(db, run_id)


def cancel_run(db: Session, run_id: str, reason: str | None = None) -> dict[str, Any] | None:
    run = get_run(db, run_id)
    if not run:
        return None
    db.execute(text("""
        UPDATE tr143_qualification_runs
        SET status='CANCELLED', progress=100,
            error=CAST(:error AS jsonb), completed_at=NOW(), updated_at=NOW()
        WHERE id=:id
    """), {'id': run_id, 'error': _json({'code':'CANCELLED','message':reason or 'Cancelled by operator'})})
    db.execute(text("""
        UPDATE tr143_qualification_steps
        SET status='CANCELLED', progress=100,
            error=CAST(:error AS jsonb), completed_at=NOW(), updated_at=NOW()
        WHERE run_id=:id AND status IN ('PENDING','RUNNING')
    """), {'id': run_id, 'error': _json({'code':'CANCELLED','message':reason or 'Cancelled by operator'})})
    db.commit()
    return get_run(db, run_id)



def replace_evidence(db: Session, run_id: str, evidence: list[dict[str, Any]]) -> None:
    ensure_schema(db)
    db.execute(text('DELETE FROM tr143_qualification_evidence WHERE run_id=:run_id'), {'run_id': run_id})
    for item in evidence:
        db.execute(text("""
            INSERT INTO tr143_qualification_evidence
                (run_id, code, label, category, weight, awarded_points, passed, value, reason)
            VALUES
                (:run_id, :code, :label, :category, :weight, :awarded_points,
                 :passed, CAST(:value AS jsonb), :reason)
        """), {
            'run_id': run_id,
            'code': item['code'],
            'label': item['label'],
            'category': item['category'],
            'weight': item['weight'],
            'awarded_points': item['awarded_points'],
            'passed': item['passed'],
            'value': _json(item.get('value') or {}),
            'reason': item.get('reason'),
        })
    db.commit()


def list_evidence(db: Session, run_id: str) -> list[dict[str, Any]]:
    ensure_schema(db)
    rows = db.execute(text("""
        SELECT * FROM tr143_qualification_evidence
        WHERE run_id=:run_id
        ORDER BY category, code
    """), {'run_id': run_id}).mappings().all()
    return [_row(row) or {} for row in rows]


def latest_run_for_device(db: Session, device_id: str) -> dict[str, Any] | None:
    ensure_schema(db)
    row = db.execute(text("""
        SELECT id FROM tr143_qualification_runs
        WHERE device_id=:device_id
        ORDER BY created_at DESC
        LIMIT 1
    """), {'device_id': device_id}).first()
    return get_run(db, str(row[0])) if row else None



def qualification_history_for_device(db: Session, device_id: str, limit: int = 20) -> list[dict[str, Any]]:
    ensure_schema(db)
    rows = db.execute(text("""
        SELECT id, device_id, status, progress, score, rating, firmware_version,
               parameters, summary, requested_by, started_at, completed_at,
               created_at, updated_at
        FROM tr143_qualification_runs
        WHERE device_id=:device_id
        ORDER BY created_at DESC
        LIMIT :limit
    """), {'device_id': device_id, 'limit': max(1, min(limit, 100))}).mappings().all()
    return [_row(row) or {} for row in rows]
