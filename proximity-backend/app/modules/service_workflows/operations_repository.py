import psycopg2.extras

from .repository import get_conn


def get_workflow_statistics():

    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    status,
                    COUNT(*) AS total
                FROM service_workflows
                GROUP BY status
                """
            )

            workflow_stats = {
                row["status"]: row["total"]
                for row in cur.fetchall()
            }

            cur.execute(
                """
                SELECT
                    status,
                    COUNT(*) AS total
                FROM workflow_execution_queue
                GROUP BY status
                """
            )

            queue_stats = {
                row["status"]: row["total"]
                for row in cur.fetchall()
            }

            return {
                "workflows": workflow_stats,
                "queue": queue_stats,
            }

def list_queue(limit: int = 50):

    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    workflow_code,
                    status,
                    priority,
                    retry_count,
                    worker_id,
                    last_error,
                    scheduled_at,
                    started_at,
                    completed_at,
                    created_at
                FROM workflow_execution_queue
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            return cur.fetchall()


def get_dashboard_data(limit: int = 20):

    stats = get_workflow_statistics()

    queue = list_queue(limit)

    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    workflow_code,
                    workflow_type,
                    service_code,
                    status,
                    current_step,
                    progress,
                    started_at,
                    completed_at
                FROM service_workflows
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            workflows = cur.fetchall()

    workflow_stats = stats.get("workflows", {})

    return {
        "summary": {
            "pending": workflow_stats.get("PENDING", 0),
            "running": workflow_stats.get("RUNNING", 0),
            "completed": workflow_stats.get("COMPLETED", 0),
            "failed": workflow_stats.get("FAILED", 0),
            "created": workflow_stats.get("CREATED", 0),
        },
        "queue": queue,
        "recent_workflows": workflows,
    }
