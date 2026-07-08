import os

import psycopg2
import psycopg2.extras

from app.core.config import settings


DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def get_version(code: str, version: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    v.*,
                    d.code AS procedure_code,
                    d.name AS procedure_name
                FROM procedure_versions v
                JOIN procedure_definitions d ON d.id = v.definition_id
                WHERE d.code = %s
                  AND v.version = %s
                """,
                (code, version),
            )
            return cur.fetchone()


def list_phases(code: str, version: str):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC, id ASC
                """,
                (version_item["id"],),
            )
            return cur.fetchall()


def get_phase(code: str, version: str, phase_id: int):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                  AND id = %s
                """,
                (version_item["id"], phase_id),
            )
            return cur.fetchone()


def get_next_phase_order(version_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(MAX(phase_order), 0) + 1
                FROM procedure_phases
                WHERE version_id = %s
                """,
                (version_id,),
            )
            return cur.fetchone()[0]


def create_phase(code: str, version: str, payload: dict):
    version_item = get_version(code, version)
    if not version_item:
        return None

    data = {
        "description": None,
        "continue_on_error": False,
        "success_transition": None,
        "error_transition": None,
        "input_variables": None,
        "output_variables": None,
        **dict(payload),
    }
    data["version_id"] = version_item["id"]

    if not data.get("phase_order"):
        data["phase_order"] = get_next_phase_order(version_item["id"])

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO procedure_phases (
                    version_id,
                    phase_order,
                    name,
                    action,
                    type,
                    timeout,
                    retry,
                    status,
                    description,
                    continue_on_error,
                    success_transition,
                    error_transition,
                    input_variables,
                    output_variables
                )
                VALUES (
                    %(version_id)s,
                    %(phase_order)s,
                    %(name)s,
                    %(action)s,
                    %(type)s,
                    %(timeout)s,
                    %(retry)s,
                    %(status)s,
                    %(description)s,
                    %(continue_on_error)s,
                    %(success_transition)s,
                    %(error_transition)s,
                    %(input_variables)s,
                    %(output_variables)s
                )
                RETURNING *
                """,
                data,
            )
            return cur.fetchone()


def update_phase(code: str, version: str, phase_id: int, payload: dict):
    current = get_phase(code, version, phase_id)
    if not current:
        return None

    data = dict(current)
    for key, value in payload.items():
        if value is not None:
            data[key] = value

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE procedure_phases
                SET phase_order = %(phase_order)s,
                    name = %(name)s,
                    action = %(action)s,
                    type = %(type)s,
                    timeout = %(timeout)s,
                    retry = %(retry)s,
                    status = %(status)s,
                    description = %(description)s,
                    continue_on_error = %(continue_on_error)s,
                    success_transition = %(success_transition)s,
                    error_transition = %(error_transition)s,
                    input_variables = %(input_variables)s,
                    output_variables = %(output_variables)s,
                    updated_at = now()
                WHERE id = %(id)s
                  AND version_id = %(version_id)s
                RETURNING *
                """,
                data,
            )
            return cur.fetchone()


def delete_phase(code: str, version: str, phase_id: int):
    phase = get_phase(code, version, phase_id)
    if not phase:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                DELETE FROM procedure_phases
                WHERE id = %s
                  AND version_id = %s
                RETURNING *
                """,
                (phase_id, phase["version_id"]),
            )
            return cur.fetchone()


def reorder_phases(code: str, version: str, items: list):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for item in items:
                cur.execute(
                    """
                    UPDATE procedure_phases
                    SET phase_order = %s,
                        updated_at = now()
                    WHERE id = %s
                      AND version_id = %s
                    """,
                    (item["phase_order"], item["phase_id"], version_item["id"]),
                )

            cur.execute(
                """
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC, id ASC
                """,
                (version_item["id"],),
            )
            return cur.fetchall()
