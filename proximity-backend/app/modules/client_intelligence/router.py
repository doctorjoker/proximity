from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Query

from .service import ClientIntelligenceService

router = APIRouter(prefix="/api/v1/client-intelligence", tags=["Client Intelligence"])


def get_service() -> ClientIntelligenceService:
    nbi_url = os.getenv("GENIEACS_NBI_URL", "http://127.0.0.1:7557")
    return ClientIntelligenceService(nbi_url=nbi_url)


@router.get("/{acs_device_id}")
async def get_clients(
    acs_device_id: str,
    refresh: bool = Query(False, description="Richiede un refresh Device.* prima della lettura"),
    settle_seconds: float = Query(4.0, ge=0.0, le=15.0),
):
    try:
        result = await get_service().inspect(acs_device_id, refresh=refresh, settle_seconds=settle_seconds)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GenieACS client intelligence failed: {exc}") from exc
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="ACS device not found")
    return result
