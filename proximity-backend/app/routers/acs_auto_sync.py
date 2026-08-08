from fastapi import APIRouter

from app.services.acs_auto_sync import acs_auto_sync_service

router = APIRouter(prefix="/api/v1/system", tags=["System"])


@router.get("/acs-sync")
async def get_acs_auto_sync_status():
    return {
        "success": True,
        **acs_auto_sync_service.status(),
    }


@router.post("/acs-sync/run")
async def run_acs_auto_sync_now():
    """Run one cycle through the same service used by the worker."""
    result = await acs_auto_sync_service.run_once()
    return {
        "success": True,
        "automatic_service": acs_auto_sync_service.status(),
        "sync": result,
    }
