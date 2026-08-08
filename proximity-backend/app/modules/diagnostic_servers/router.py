from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from .schemas import DiagnosticValidationRequest
from .service import list_servers, seed_defaults, validate_server_file

router=APIRouter(prefix="/api/v1/diagnostic-servers", tags=["Diagnostic Server Catalog"])

@router.get("")
def list_api(include_disabled: bool=Query(False), db: Session=Depends(get_db)):
    return {"success":True,"version":"EUREKA36.4.0","items":list_servers(db,include_disabled)}

@router.post("/seed")
def seed_api(db: Session=Depends(get_db)):
    seed_defaults(db)
    return {"success":True,"items":list_servers(db,True)}

@router.post("/{server_id}/validate")
def validate_api(server_id:int,payload:DiagnosticValidationRequest,db:Session=Depends(get_db)):
    try:
        return {"success":True,"validation":validate_server_file(db,server_id,payload.file_id,payload.timeout_seconds)}
    except Exception as exc:
        raise HTTPException(status_code=400,detail=str(exc)) from exc
