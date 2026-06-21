import os
import psycopg2
import psycopg2.extras


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def list_customer_services():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM customer_services
                ORDER BY created_at DESC
                LIMIT 200
            """)
            return cur.fetchall()


def get_customer_service(service_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM customer_services
                WHERE service_code = %s
            """, (service_code,))
            return cur.fetchone()


def create_customer_service(data):
    payload = data.dict()

    commercial_status = payload.get("commercial_status", "ACTIVE")
    authority_status = payload.get("authority_status", commercial_status)

    if commercial_status in ("ACTIVE", "PRO", "VALID") and authority_status in ("ACTIVE", "PRO", "VALID"):
        payload["provisioning_profile"] = "INTERNET_FULL"
        payload["provisioning_allowed"] = True
    elif commercial_status in ("SUSPENDED", "BLOCKED") or authority_status in ("SUSPENDED", "BLOCKED"):
        payload["provisioning_profile"] = "INTERNET_SUSPENDED"
        payload["provisioning_allowed"] = True
    else:
        payload["provisioning_profile"] = "NO_PROVISIONING"
        payload["provisioning_allowed"] = False

    payload["authority_checked_at"] = None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO customer_services (
                    service_code,
                    customer_id,
                    customer_name,
                    service_type,
                    access_type,
                    plan_name,
                    status,
                    pppoe_username,
                    pppoe_password,
                    vlan,
                    source_system,
                    source_order_code,
                    commercial_status,
                    provisioning_profile,
                    provisioning_allowed,
                    authority_source,
                    authority_status,
                    authority_checked_at
                )
                VALUES (
                    %(service_code)s,
                    %(customer_id)s,
                    %(customer_name)s,
                    %(service_type)s,
                    %(access_type)s,
                    %(plan_name)s,
                    %(status)s,
                    %(pppoe_username)s,
                    %(pppoe_password)s,
                    %(vlan)s,
                    %(source_system)s,
                    %(source_order_code)s,
                    %(commercial_status)s,
                    %(provisioning_profile)s,
                    %(provisioning_allowed)s,
                    %(authority_source)s,
                    %(authority_status)s,
                    %(authority_checked_at)s
                )
                ON CONFLICT (service_code)
                DO UPDATE SET
                    customer_id = EXCLUDED.customer_id,
                    customer_name = EXCLUDED.customer_name,
                    service_type = EXCLUDED.service_type,
                    access_type = EXCLUDED.access_type,
                    plan_name = EXCLUDED.plan_name,
                    status = EXCLUDED.status,
                    pppoe_username = EXCLUDED.pppoe_username,
                    pppoe_password = EXCLUDED.pppoe_password,
                    vlan = EXCLUDED.vlan,
                    source_system = EXCLUDED.source_system,
                    source_order_code = EXCLUDED.source_order_code,
                    commercial_status = EXCLUDED.commercial_status,
                    provisioning_profile = EXCLUDED.provisioning_profile,
                    provisioning_allowed = EXCLUDED.provisioning_allowed,
                    authority_source = EXCLUDED.authority_source,
                    authority_status = EXCLUDED.authority_status,
                    authority_checked_at = EXCLUDED.authority_checked_at,
                    updated_at = now()
                RETURNING *
            """, payload)
            return cur.fetchone()

def create_provisioning_job(service_code: str, requested_by: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO provisioning_jobs (
                    job_code,
                    service_code,
                    job_type,
                    state,
                    requested_by,
                    result
                )
                VALUES (
                    'TMP',
                    %s,
                    'INTERNET_PROVISIONING',
                    'CREATED',
                    %s,
                    '{}'::jsonb
                )
                RETURNING *
            """, (service_code, requested_by))

            job = cur.fetchone()
            job_code = f"PRV-{job['id']:06d}"

            cur.execute("""
                UPDATE provisioning_jobs
                SET job_code = %s
                WHERE id = %s
                RETURNING *
            """, (job_code, job["id"]))

            return cur.fetchone()


def bind_device_to_service(service_code: str, data):
    payload = data.dict()
    payload["service_code"] = service_code

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO device_bindings (
                    service_code,
                    acs_device_id,
                    serial_number,
                    vendor,
                    model,
                    binding_status
                )
                VALUES (
                    %(service_code)s,
                    %(acs_device_id)s,
                    %(serial_number)s,
                    %(vendor)s,
                    %(model)s,
                    %(binding_status)s
                )
                RETURNING *
            """, payload)
            return cur.fetchone()


def get_device_binding(service_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM device_bindings
                WHERE service_code = %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (service_code,))
            return cur.fetchone()


def update_provisioning_job_state(job_code: str, state: str, result: dict = None):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                UPDATE provisioning_jobs
                SET state = %s,
                    result = COALESCE(%s::jsonb, result),
                    completed_at = CASE
                        WHEN %s IN ('COMPLETED', 'FAILED') THEN now()
                        ELSE completed_at
                    END
                WHERE job_code = %s
                RETURNING *
            """, (
                state,
                psycopg2.extras.Json(result) if result is not None else None,
                state,
                job_code
            ))
            return cur.fetchone()
