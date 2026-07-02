from .repository import get_conn
import psycopg2.extras


def enqueue_workflow(
    workflow_code: str,
    priority: int = 100,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                INSERT INTO workflow_execution_queue
                (
                    workflow_code,
                    status,
                    priority
                )
                VALUES
                (
                    %s,
                    'PENDING',
                    %s
                )
                RETURNING *
                """,
                (
                    workflow_code,
                    priority,
                ),
            )

            return cur.fetchone()


def get_queue_item_by_workflow(
    workflow_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                SELECT *
                FROM workflow_execution_queue
                WHERE workflow_code = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (workflow_code,),
            )

            return cur.fetchone()


def dequeue_next(worker_id: str = "PROXIMITY-WORKER"):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                UPDATE workflow_execution_queue
                SET
                    status = 'RUNNING',
                    started_at = now(),
                    worker_id = %s,
                    updated_at = now()
                WHERE id = (
                    SELECT id
                    FROM workflow_execution_queue
                    WHERE status = 'PENDING'
                      AND scheduled_at <= now()
                    ORDER BY priority ASC, scheduled_at ASC, created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING *
                """,
                (worker_id,),
            )

            return cur.fetchone()


def mark_queue_completed(queue_id: str):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                UPDATE workflow_execution_queue
                SET
                    status = 'COMPLETED',
                    completed_at = now(),
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (queue_id,),
            )

            return cur.fetchone()


def mark_queue_failed(queue_id: str, error: str):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                UPDATE workflow_execution_queue
                SET
                    status = 'FAILED',
                    completed_at = now(),
                    last_error = %s,
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (
                    error,
                    queue_id,
                ),
            )

            return cur.fetchone()


def reschedule_queue_item(
    queue_id: str,
    delay_seconds: int = 30,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                UPDATE workflow_execution_queue
                SET
                    status = 'PENDING',
                    retry_count = retry_count + 1,
                    scheduled_at = now() + (%s || ' seconds')::interval,
                    started_at = NULL,
                    completed_at = NULL,
                    worker_id = NULL,
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (
                    delay_seconds,
                    queue_id,
                ),
            )

            return cur.fetchone()


def recover_running_workflows():
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:

            cur.execute(
                """
                UPDATE workflow_execution_queue
                SET
                    status='PENDING',
                    worker_id=NULL,
                    started_at=NULL,
                    updated_at=now()
                WHERE status='RUNNING'
                RETURNING *
                """
            )

            return cur.fetchall()
