import psycopg2.extras

from .repository import get_conn


def normalize_operation_name(workflow_type: str):
    mapping = {
        "ROUTER_REPLACEMENT": "Router Replacement",
        "PROVISIONING": "Service Provisioning",
        "FIRMWARE_UPGRADE": "Firmware Upgrade",
        "CONFIGURATION_RESTORE": "Configuration Restore",
        "SERVICE_VERIFICATION": "Service Verification",
    }

    return mapping.get(
        workflow_type,
        workflow_type.replace("_", " ").title(),
    )


def normalize_step_name(step_name: str | None):
    if not step_name:
        return "-"

    mapping = {
        "INITIALIZED": "Initialized",
        "BINDING": "Binding Router",
        "WAIT_ROUTER": "Waiting Router Online",
        "RESTORE": "Restoring Configuration",
        "VERIFY": "Verifying Service",
        "FINISHED": "Finished",
    }

    return mapping.get(
        step_name,
        step_name.replace("_", " ").title(),
    )


def list_business_operations(limit: int = 50):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:
            cur.execute(
                """
                SELECT
                    sw.workflow_code,
                    sw.workflow_type,
                    sw.service_code,
                    sw.acs_device_id,
                    sw.status,
                    sw.current_step,
                    sw.progress,
                    sw.started_at,
                    sw.completed_at,
                    sw.error_code,
                    sw.error_message,
                    sw.payload,

                    q.retry_count,
                    q.worker_id,
                    q.last_error,
                    q.scheduled_at,

                    cs.customer_id,
                    cs.customer_name,
                    cs.plan_name,
                    cs.status AS service_status
                FROM service_workflows sw
                LEFT JOIN workflow_execution_queue q
                    ON q.workflow_code = sw.workflow_code
                LEFT JOIN customer_services cs
                    ON cs.service_code = sw.service_code
                ORDER BY sw.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            rows = cur.fetchall()

    items = []

    for row in rows:
        items.append(
            {
                "operation_code": row["workflow_code"].replace(
                    "WF-",
                    "OP-",
                ),
                "workflow_code": row["workflow_code"],
                "workflow_type": row["workflow_type"],
                "operation": normalize_operation_name(
                    row["workflow_type"],
                ),
                "customer": {
                    "customer_id": row.get("customer_id"),
                    "name": row.get("customer_name") or "Unknown Customer",
                },
                "service": {
                    "service_code": row["service_code"],
                    "plan": row.get("plan_name") or "-",
                    "status": row.get("service_status"),
                },
                "device": {
                    "acs_device_id": row.get("acs_device_id"),
                },
                "status": row["status"],
                "current_step": normalize_step_name(
                    row.get("current_step"),
                ),
                "technical_step": row.get("current_step"),
                "progress": row.get("progress") or 0,
                "assigned_worker": row.get("worker_id"),
                "retry_count": row.get("retry_count") or 0,
                "last_error": row.get("last_error")
                or row.get("error_message"),
                "started_at": row.get("started_at"),
                "completed_at": row.get("completed_at"),
                "scheduled_at": row.get("scheduled_at"),
            }
        )

    return items
