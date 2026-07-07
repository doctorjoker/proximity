import psycopg2.extras

from .repository import get_conn


DEFAULT_LOCK_TIMEOUT_SECONDS = 300


def cleanup_expired_locks():
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                DELETE
                FROM workflow_execution_locks
                WHERE expires_at <= now()
                """
            )

            return cur.rowcount


def acquire_lock(
    workflow_code: str,
    resource_type: str,
    resource_id: str,
    timeout_seconds: int = DEFAULT_LOCK_TIMEOUT_SECONDS,
):
    cleanup_expired_locks()

    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            try:
                cur.execute(
                    """
                    INSERT INTO workflow_execution_locks
                    (
                        workflow_code,
                        resource_type,
                        resource_id,
                        expires_at
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        now() + (%s || ' seconds')::interval
                    )
                    RETURNING *
                    """,
                    (
                        workflow_code,
                        resource_type,
                        resource_id,
                        timeout_seconds,
                    ),
                )

                return {
                    "success": True,
                    "lock": cur.fetchone(),
                }

            except Exception:
                return {
                    "success": False,
                    "reason": "LOCK_ALREADY_ACQUIRED",
                }


def release_locks(
    workflow_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                DELETE
                FROM workflow_execution_locks
                WHERE workflow_code=%s
                RETURNING *
                """,
                (
                    workflow_code,
                ),
            )

            return cur.fetchall()


def get_locks_by_workflow(
    workflow_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                SELECT *
                FROM workflow_execution_locks
                WHERE workflow_code=%s
                ORDER BY created_at
                """,
                (
                    workflow_code,
                ),
            )

            return cur.fetchall()


def get_lock(
    resource_type: str,
    resource_id: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                SELECT *
                FROM workflow_execution_locks
                WHERE resource_type=%s
                  AND resource_id=%s
                """,
                (
                    resource_type,
                    resource_id,
                ),
            )

            return cur.fetchone()
