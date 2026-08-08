from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.acs_discovery import synchronize_acs_devices

router = APIRouter(prefix="/api/v1/acs/discovery", tags=["ACS Discovery"])


@router.post("/sync")
async def sync_acs_devices(db: Session = Depends(get_db)):
    """Administrative/manual synchronization endpoint.

    Normal inventory alignment is performed automatically by the ACS Auto
    Discovery worker. This endpoint remains available for maintenance.
    """
    return await synchronize_acs_devices(db)
