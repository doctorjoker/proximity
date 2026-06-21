import os
import psycopg2
import psycopg2.extras


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def get_assigned_devices(service_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM customer_assigned_devices
                WHERE service_code=%s
                ORDER BY id
            """, (service_code,))
            return cur.fetchall()


def get_assigned_device(service_code: str, acs_device_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM customer_assigned_devices
                WHERE service_code=%s
                AND acs_device_id=%s
                LIMIT 1
            """, (
                service_code,
                acs_device_id
            ))
            return cur.fetchone()
