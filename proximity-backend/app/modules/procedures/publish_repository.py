import os
import re

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
                    d.id AS procedure_id,
                    d.code AS procedure_code,
                    d.name AS procedure_name,
                    d.active_version_id,
                    d.draft_version_id
                FROM procedure_versions v
                JOIN procedure_definitions d ON d.id = v.definition_id
                WHERE d.code = %s
                  AND v.version = %s
                """,
                (code, version),
            )
            return cur.fetchone()


def list_version_phases(version_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC, id ASC
                """,
                (version_id,),
            )
            return cur.fetchall()


def list_version_variables(version_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM procedure_variables
                WHERE version_id = %s
                ORDER BY scope ASC, name ASC
                """,
                (version_id,),
            )
            return cur.fetchall()


def _next_version(existing_versions):
    numeric = []
    for item in existing_versions:
        value = item.get("version")
        match = re.match(r"^v(\d+)\.(\d+)$", value or "")
        if match:
            numeric.append((int(match.group(1)), int(match.group(2))))

    if not numeric:
        return "v1.0"

    major, minor = sorted(numeric)[-1]
    return f"v{major}.{minor + 1}"


def get_next_version(definition_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT version
                FROM procedure_versions
                WHERE definition_id = %s
                """,
                (definition_id,),
            )
            return _next_version(cur.fetchall())


def publish_version(code: str, version: str, requested_by: str):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Move currently active version to historical, excluding the target version.
            cur.execute(
                """
                UPDATE procedure_versions
                SET status = 'HISTORICAL',
                    updated_at = now()
                WHERE definition_id = %s
                  AND status = 'ACTIVE'
                  AND id <> %s
                """,
                (version_item["definition_id"], version_item["id"]),
            )

            cur.execute(
                """
                UPDATE procedure_versions
                SET status = 'ACTIVE',
                    published_at = now(),
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (version_item["id"],),
            )
            published = cur.fetchone()

            cur.execute(
                """
                UPDATE procedure_definitions
                SET status = 'ACTIVE',
                    active_version_id = %s,
                    draft_version_id = CASE
                        WHEN draft_version_id = %s THEN NULL
                        ELSE draft_version_id
                    END,
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (
                    version_item["id"],
                    version_item["id"],
                    version_item["definition_id"],
                ),
            )
            procedure = cur.fetchone()

            return {
                "procedure": procedure,
                "version": published,
                "requested_by": requested_by,
            }


def clone_version(code: str, version: str, requested_by: str, target_version=None, notes=None):
    source = get_version(code, version)
    if not source:
        return None

    new_version = target_version or get_next_version(source["definition_id"])
    phases = list_version_phases(source["id"])
    variables = list_version_variables(source["id"])

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO procedure_versions (
                    definition_id,
                    version,
                    status,
                    base_version,
                    notes,
                    created_by
                )
                VALUES (
                    %(definition_id)s,
                    %(version)s,
                    'DRAFT',
                    %(base_version)s,
                    %(notes)s,
                    %(created_by)s
                )
                RETURNING *
                """,
                {
                    "definition_id": source["definition_id"],
                    "version": new_version,
                    "base_version": source["version"],
                    "notes": notes or f"Bozza clonata da {source['version']}.",
                    "created_by": requested_by,
                },
            )
            cloned = cur.fetchone()

            for phase in phases:
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
                    """,
                    {
                        **dict(phase),
                        "version_id": cloned["id"],
                    },
                )

            for variable in variables:
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
                    """,
                    {
                        **dict(variable),
                        "version_id": cloned["id"],
                    },
                )

            cur.execute(
                """
                UPDATE procedure_definitions
                SET draft_version_id = %s,
                    updated_at = now()
                WHERE id = %s
                RETURNING *
                """,
                (cloned["id"], source["definition_id"]),
            )
            procedure = cur.fetchone()

            return {
                "procedure": procedure,
                "version": cloned,
                "source_version": source["version"],
                "requested_by": requested_by,
            }
