import os
import psycopg2
import psycopg2.extras


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def list_desired_configs(service_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM desired_service_configurations
                WHERE service_code = %s
                ORDER BY config_type
            """, (service_code,))
            return cur.fetchall()


def upsert_desired_config(service_code: str, config_type: str, payload):
    data = payload.dict()
    config_type = config_type.upper()

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO desired_service_configurations (
                    service_code,
                    config_type,
                    source_system,
                    source_reference,
                    enabled,
                    configuration
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::jsonb
                )
                ON CONFLICT (service_code, config_type)
                DO UPDATE SET
                    source_system = EXCLUDED.source_system,
                    source_reference = EXCLUDED.source_reference,
                    enabled = EXCLUDED.enabled,
                    configuration = EXCLUDED.configuration,
                    updated_at = now()
                RETURNING *
            """, (
                service_code,
                config_type,
                data["source_system"],
                data["source_reference"],
                data["enabled"],
                psycopg2.extras.Json(data["configuration"]),
            ))
            return cur.fetchone()
