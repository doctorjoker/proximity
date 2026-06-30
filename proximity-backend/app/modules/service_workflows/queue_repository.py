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
