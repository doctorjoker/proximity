from __future__ import annotations

import os
from typing import Any

import psycopg2
import psycopg2.extras

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db",
)

def _connect():
    return psycopg2.connect(DATABASE_URL)


def list_history(
    acs_device_id: str,
    diagnostic_type: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:

    where = ["acs_device_id = %s"]
    params: list[Any] = [acs_device_id]

    if diagnostic_type:
        where.append("diagnostic_type = %s")
        params.append(diagnostic_type.upper())

    params.append(limit)

    sql = f"""
        SELECT *
        FROM diagnostic_executions
        WHERE {' AND '.join(where)}
        ORDER BY started_at DESC
        LIMIT %s
    """

    conn = _connect()

    try:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(sql, params)

            executions = cur.fetchall()

            for execution in executions:

                cur.execute(
                    """
                    SELECT
                        event_key,
                        event_type,
                        phase,
                        title,
                        detail,
                        occurred_at,
                        metadata
                    FROM diagnostic_execution_events
                    WHERE execution_id=%s
                    ORDER BY occurred_at,id
                    """,
                    (execution["execution_id"],),
                )

                execution["events"] = cur.fetchall()

            return executions

    finally:
        conn.close()
