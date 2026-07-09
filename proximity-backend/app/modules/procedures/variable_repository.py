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


def list_variables(code: str, version: str):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_variables
                WHERE version_id = %s
                ORDER BY
                    CASE scope
                        WHEN 'Input' THEN 1
                        WHEN 'Secret' THEN 2
                        WHEN 'Output' THEN 3
                        WHEN 'Constant' THEN 4
                        WHEN 'Costante' THEN 4
                        ELSE 9
                    END,
                    name ASC,
                    id ASC
                """,
                (version_item["id"],),
            )
            return cur.fetchall()


def get_variable(code: str, version: str, variable_id: int):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_variables
                WHERE version_id = %s
                  AND id = %s
                """,
                (version_item["id"], variable_id),
            )
            return cur.fetchone()


def create_variable(code: str, version: str, payload: dict):
    version_item = get_version(code, version)
    if not version_item:
        return None

    data = {
        "version_id": version_item["id"],
        "scope": "Input",
        "name": None,
        "type": "string",
        "required": False,
        "default_value": None,
        "description": None,
        **dict(payload),
    }

    if data.get("name"):
        data["name"] = str(data["name"]).strip().upper()

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO procedure_variables (
                    version_id,
                    scope,
                    name,
                    type,
                    required,
                    default_value,
                    description
                )
                VALUES (
                    %(version_id)s,
                    %(scope)s,
                    %(name)s,
                    %(type)s,
                    %(required)s,
                    %(default_value)s,
                    %(description)s
                )
                RETURNING *
                """,
                data,
            )
            return cur.fetchone()


def update_variable(code: str, version: str, variable_id: int, payload: dict):
    current = get_variable(code, version, variable_id)
    if not current:
        return None

    data = dict(current)
    for key, value in payload.items():
        if value is not None:
            data[key] = value

    if data.get("name"):
        data["name"] = str(data["name"]).strip().upper()

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE procedure_variables
                SET scope = %(scope)s,
                    name = %(name)s,
                    type = %(type)s,
                    required = %(required)s,
                    default_value = %(default_value)s,
                    description = %(description)s,
                    updated_at = now()
                WHERE id = %(id)s
                  AND version_id = %(version_id)s
                RETURNING *
                """,
                data,
            )
            return cur.fetchone()


def delete_variable(code: str, version: str, variable_id: int):
    variable = get_variable(code, version, variable_id)
    if not variable:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                DELETE FROM procedure_variables
                WHERE id = %s
                  AND version_id = %s
                RETURNING *
                """,
                (variable_id, variable["version_id"]),
            )
            return cur.fetchone()
