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
