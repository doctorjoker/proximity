from __future__ import annotations

import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import text
from sqlalchemy.orm import Session

SCHEMA = """
CREATE TABLE IF NOT EXISTS diagnostic_servers (
 id BIGSERIAL PRIMARY KEY,
 code VARCHAR(80) NOT NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 server_type VARCHAR(40) NOT NULL DEFAULT 'TR143_HTTP',
 base_url TEXT NOT NULL,
 download_path TEXT NOT NULL DEFAULT '/download',
 upload_url TEXT NULL,
 is_default BOOLEAN NOT NULL DEFAULT FALSE,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 notes TEXT NULL,
 last_validation_status VARCHAR(40) NULL,
 last_validation_message TEXT NULL,
 last_validated_at TIMESTAMPTZ NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS diagnostic_server_files (
 id BIGSERIAL PRIMARY KEY,
 server_id BIGINT NOT NULL REFERENCES diagnostic_servers(id) ON DELETE CASCADE,
 label VARCHAR(120) NOT NULL,
 relative_path TEXT NOT NULL,
 expected_size_bytes BIGINT NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(server_id, relative_path)
);
"""

def ensure_schema(db: Session) -> None:
    for stmt in [x.strip() for x in SCHEMA.split(';') if x.strip()]:
        db.execute(text(stmt))
    db.commit()

def _d(row):
    return dict(row._mapping)

def seed_defaults(db: Session) -> None:
    ensure_schema(db)
    servers = [
      ("speednet-internal", "Speednet Internal", "TR143_HTTP", "http://10.40.0.22:8081", "/download", True, True, "Server diagnostico interno Speednet"),
      ("tele2-public", "Tele2 Public", "TR143_HTTP", "http://speedtest.tele2.net", "", False, True, "Server pubblico esterno di confronto"),
      ("eolo-web", "EOLO Public Web", "WEB_SPEEDTEST", "https://test.eolo.it", "", False, False, "Non qualificato come endpoint TR-143"),
      ("ookla-custom", "Ookla / Custom", "OOKLA", "https://www.speedtest.net", "", False, False, "Richiede integrazione Ookla dedicata"),
    ]
    for code,name,stype,base,path,is_default,enabled,notes in servers:
        db.execute(text("""
          INSERT INTO diagnostic_servers(code,name,server_type,base_url,download_path,is_default,enabled,notes)
          VALUES(:code,:name,:stype,:base,:path,:is_default,:enabled,:notes)
          ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, server_type=EXCLUDED.server_type,
            base_url=EXCLUDED.base_url, download_path=EXCLUDED.download_path, notes=EXCLUDED.notes, updated_at=NOW()
        """), dict(code=code,name=name,stype=stype,base=base,path=path,is_default=is_default,enabled=enabled,notes=notes))
    db.execute(text("UPDATE diagnostic_servers SET is_default=(code='speednet-internal') WHERE code IN ('speednet-internal','tele2-public','eolo-web','ookla-custom')"))
    files = {
      "speednet-internal": [("10 MB","10MB.bin",10485760,10),("100 MB","100MB.bin",104857600,20)],
      "tele2-public": [("10 MB","10MB.zip",10485760,10),("100 MB","100MB.zip",104857600,20)],
    }
    for code, items in files.items():
        sid = db.execute(text("SELECT id FROM diagnostic_servers WHERE code=:code"), {"code":code}).scalar_one()
        for label,path,size,order in items:
            db.execute(text("""
              INSERT INTO diagnostic_server_files(server_id,label,relative_path,expected_size_bytes,sort_order)
              VALUES(:sid,:label,:path,:size,:ord)
              ON CONFLICT(server_id,relative_path) DO UPDATE SET label=EXCLUDED.label,
                expected_size_bytes=EXCLUDED.expected_size_bytes, sort_order=EXCLUDED.sort_order, updated_at=NOW()
            """), dict(sid=sid,label=label,path=path,size=size,ord=order))
    db.commit()

def list_servers(db: Session, include_disabled: bool=False):
    seed_defaults(db)
    where = "" if include_disabled else "WHERE enabled=TRUE"
    rows = db.execute(text(f"SELECT * FROM diagnostic_servers {where} ORDER BY is_default DESC,name")).fetchall()
    out=[]
    for row in rows:
        item=_d(row)
        files=db.execute(text("SELECT * FROM diagnostic_server_files WHERE server_id=:sid AND (:all OR enabled=TRUE) ORDER BY sort_order,expected_size_bytes"), {"sid":item["id"],"all":include_disabled}).fetchall()
        item["files"]=[_d(x) for x in files]
        out.append(item)
    return out

def get_server(db: Session, server_id: int):
    return next((x for x in list_servers(db, True) if x["id"]==server_id), None)

def build_url(server, file_item):
    base=server["base_url"].rstrip('/')
    path=(server.get("download_path") or '').strip('/')
    name=file_item["relative_path"].lstrip('/')
    return '/'.join(x for x in (base,path,name) if x)

def resolve_download_url(db: Session, server_id=None, file_id=None, requested_url=None):
    seed_defaults(db)
    if requested_url:
        return {"server_name":"Custom","url":requested_url,"expected_size_bytes":None,"server_id":None,"file_id":None}
    if server_id:
        server=get_server(db,int(server_id))
    else:
        sid=db.execute(text("SELECT id FROM diagnostic_servers WHERE enabled=TRUE ORDER BY is_default DESC,name LIMIT 1")).scalar_one()
        server=get_server(db,sid)
    if not server:
        raise RuntimeError("No enabled diagnostic server configured")
    files=server.get("files") or []
    file_item=next((x for x in files if file_id and x["id"]==int(file_id)), None)
    if not file_item:
        file_item=next((x for x in files if x["expected_size_bytes"]==104857600), files[0] if files else None)
    if not file_item:
        raise RuntimeError(f"No files configured for {server['name']}")
    return {"server_id":server["id"],"file_id":file_item["id"],"server_name":server["name"],"file_label":file_item["label"],"url":build_url(server,file_item),"expected_size_bytes":file_item["expected_size_bytes"]}

def validate_server_file(db: Session, server_id: int, file_id: int|None, timeout_seconds: int):
    resolved=resolve_download_url(db,server_id,file_id)
    status="FAILED"; message=""; http_status=None; actual=None; ctype=None
    try:
        req=urllib.request.Request(resolved["url"], method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            http_status=resp.status; ctype=resp.headers.get("Content-Type")
            actual=int(resp.headers.get("Content-Length")) if resp.headers.get("Content-Length") else None
            expected=resolved["expected_size_bytes"]
            if http_status!=200: message=f"HTTP {http_status}"
            elif actual is None: message="Content-Length missing"
            elif expected and abs(actual-expected)>max(1024,int(expected*0.05)): message=f"Expected {expected} bytes, received {actual}"
            elif ctype and "text/html" in ctype.lower(): message=f"Unexpected content type: {ctype}"
            else: status="VALID"; message=f"HTTP 200, {actual} bytes, {ctype or 'unknown'}"
    except urllib.error.HTTPError as exc:
        http_status=exc.code; message=f"HTTP {exc.code}: {exc.reason}"
    except Exception as exc:
        message=str(exc)
    db.execute(text("UPDATE diagnostic_servers SET last_validation_status=:s,last_validation_message=:m,last_validated_at=NOW(),updated_at=NOW() WHERE id=:id"), {"s":status,"m":message,"id":server_id})
    db.commit()
    return {**resolved,"status":status,"message":message,"http_status":http_status,"content_type":ctype,"actual_size_bytes":actual,"validated_at":datetime.now(timezone.utc).isoformat()}
