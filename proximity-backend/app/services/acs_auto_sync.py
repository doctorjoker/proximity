from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from time import perf_counter
from typing import Any

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.acs_discovery import synchronize_acs_devices

logger = logging.getLogger("proximity.acs_auto_sync")


class AcsAutoSyncService:
    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._cycle_lock = asyncio.Lock()
        self._state: dict[str, Any] = {
            "enabled": bool(settings.acs_auto_sync_enabled),
            "running": False,
            "mode": settings.acs_auto_sync_mode,
            "interval_seconds": settings.acs_auto_sync_interval_seconds,
            "started_at": None,
            "last_attempt_at": None,
            "last_success_at": None,
            "last_duration_ms": None,
            "last_devices": None,
            "last_error": None,
            "cycles_total": 0,
            "cycles_successful": 0,
            "cycles_failed": 0,
        }

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> dict[str, Any]:
        state = dict(self._state)
        state["running"] = self.is_running
        return state

    async def start(self) -> None:
        if not settings.acs_auto_sync_enabled:
            logger.info("ACS Auto Sync disabled by configuration")
            self._state["enabled"] = False
            return

        if self.is_running:
            return

        self._stop_event = asyncio.Event()
        self._state.update(
            {
                "enabled": True,
                "running": True,
                "started_at": self._now_iso(),
                "last_error": None,
            }
        )
        self._task = asyncio.create_task(
            self._run_loop(),
            name="proximity-acs-auto-sync",
        )
        logger.info(
            "ACS Auto Sync started: interval=%ss mode=%s",
            settings.acs_auto_sync_interval_seconds,
            settings.acs_auto_sync_mode,
        )

    async def stop(self) -> None:
        if self._stop_event is not None:
            self._stop_event.set()

        task = self._task
        if task is not None and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self._task = None
        self._state["running"] = False
        logger.info("ACS Auto Sync stopped")

    async def run_once(self) -> dict[str, Any]:
        async with self._cycle_lock:
            started = perf_counter()
            self._state["last_attempt_at"] = self._now_iso()
            self._state["cycles_total"] += 1
            db = SessionLocal()

            try:
                result = await synchronize_acs_devices(db)
                duration_ms = round((perf_counter() - started) * 1000, 2)
                self._state.update(
                    {
                        "last_success_at": self._now_iso(),
                        "last_duration_ms": duration_ms,
                        "last_devices": result["count"],
                        "last_error": None,
                        "cycles_successful": self._state["cycles_successful"] + 1,
                    }
                )
                logger.info(
                    "ACS Auto Sync completed: devices=%s duration_ms=%s",
                    result["count"],
                    duration_ms,
                )
                return result
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                db.rollback()
                duration_ms = round((perf_counter() - started) * 1000, 2)
                self._state.update(
                    {
                        "last_duration_ms": duration_ms,
                        "last_error": f"{type(exc).__name__}: {exc}",
                        "cycles_failed": self._state["cycles_failed"] + 1,
                    }
                )
                logger.exception("ACS Auto Sync cycle failed")
                raise
            finally:
                db.close()

    async def _run_loop(self) -> None:
        assert self._stop_event is not None
        interval = max(5, int(settings.acs_auto_sync_interval_seconds))

        while not self._stop_event.is_set():
            try:
                await self.run_once()
            except asyncio.CancelledError:
                raise
            except Exception:
                # Failure state is already recorded; the worker remains alive.
                pass

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=interval)
            except asyncio.TimeoutError:
                continue


acs_auto_sync_service = AcsAutoSyncService()
