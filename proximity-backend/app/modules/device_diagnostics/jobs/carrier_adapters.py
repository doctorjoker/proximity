from __future__ import annotations
import asyncio
from typing import Any
from app.db.session import SessionLocal
from app.models.device import Device
from app.routers.device_diagnostics import DownloadDiagnosticsRequest, PingRequest, poll_download_status, poll_ping_status, start_download_diagnostics, start_ping
from app.modules.diagnostic_servers.service import resolve_download_url

def _identity(device_id: str) -> str:
    db=SessionLocal()
    try:
        device=db.query(Device).filter(Device.id==device_id).first()
        if not device or not getattr(device,'acs_device_id',None):
            raise RuntimeError('Device or ACS identity not found')
        return device.acs_device_id
    finally:
        db.close()


def _resolve_catalog_download_url(context: dict[str, Any], p: dict[str, Any]) -> str:
    requested=p.get("url") or p.get("download_url")
    db=context.get("db")
    if db is None:
        return requested or "http://10.40.0.22:8081/download/100MB.bin"
    resolved=resolve_download_url(db,server_id=p.get("diagnostic_server_id"),file_id=p.get("diagnostic_file_id"),requested_url=requested)
    p["resolved_server_name"]=resolved.get("server_name")
    p["resolved_url"]=resolved.get("url")
    p["expected_size_bytes"]=resolved.get("expected_size_bytes")
    return resolved["url"]

async def ping_adapter(context: dict[str, Any]) -> dict[str, Any]:
    acs=_identity(str(context['device_id']))
    p=context.get('parameters') or {}
    await start_ping(acs, PingRequest(host=p.get('host','1.1.1.1'), repetitions=int(p.get('repetitions',4)), timeout_ms=int(p.get('timeout_ms',5000)), data_block_size=int(p.get('data_block_size',56))))
    latest={}
    for _ in range(60):
        await asyncio.sleep(2)
        latest=await poll_ping_status(acs)
        state=str(latest.get('state') or latest.get('execution_state') or '').upper()
        if state in {'COMPLETE','COMPLETED','ERROR','TIMEOUT'}: break
    state=str(latest.get('state') or latest.get('execution_state') or 'TIMEOUT').upper()
    if state not in {'COMPLETE','COMPLETED'}: raise RuntimeError(f'Ping did not complete: {state}')
    return {**latest,'adapter':'LEGACY_ACTIVE_PING','diagnostic_type':'PING','message':f"Ping completato: media {latest.get('average_response_time_ms')} ms, perdita {latest.get('packet_loss_percent')}%."}

async def _download(context: dict[str, Any], diagnostic_type: str) -> dict[str, Any]:
    acs=_identity(str(context['device_id']))
    p=context.get('parameters') or {}
    await start_download_diagnostics(acs, DownloadDiagnosticsRequest(url=_resolve_catalog_download_url(context, p), interface=p.get('interface'), dscp=int(p.get('dscp',0)), ethernet_priority=int(p.get('ethernet_priority',0))))
    latest={}
    for _ in range(120):
        await asyncio.sleep(3)
        latest=await poll_download_status(acs)
        state=str(latest.get('state') or latest.get('execution_state') or '').upper()
        if state in {'COMPLETE','COMPLETED','ERROR','TIMEOUT'}: break
    state=str(latest.get('state') or latest.get('execution_state') or 'TIMEOUT').upper()
    if state not in {'COMPLETE','COMPLETED'}: raise RuntimeError(f'TR-143 download did not complete: {state}')
    return {**latest,'adapter':'LEGACY_TR143_DOWNLOAD','diagnostic_type':diagnostic_type,'mode':'DOWNLOAD_ONLY','message':f"TR-143 download completato: {latest.get('throughput_mbps')} Mbps."}

async def download_adapter(context: dict[str, Any]) -> dict[str, Any]:
    return await _download(context,'DOWNLOAD_DIAGNOSTIC')

async def speedtest_adapter(context: dict[str, Any]) -> dict[str, Any]:
    return await _download(context,'TR143_SPEEDTEST')
