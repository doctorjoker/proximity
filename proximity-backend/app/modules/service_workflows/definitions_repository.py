import psycopg2.extras

from .repository import get_conn


def list_definitions():
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    definition_code,
                    name,
                    description,
                    status,
                    created_at,
                    updated_at
                FROM workflow_definitions
                ORDER BY definition_code
                """
            )

            return cur.fetchall()


def get_definition(
    definition_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    definition_code,
                    name,
                    description,
                    status,
                    created_at,
                    updated_at
                FROM workflow_definitions
                WHERE definition_code = %s
                """,
                (definition_code,),
            )

            return cur.fetchone()


def get_published_definition(
    definition_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:

            cur.execute(
                """
                SELECT
                    definition_code,
                    version,
                    status,
                    definition_json,
                    published_at,
                    created_at,
                    updated_at
                FROM workflow_definition_versions
                WHERE definition_code = %s
                  AND status = 'PUBLISHED'
                LIMIT 1
                """,
                (definition_code,),
            )

            return cur.fetchone()


def list_definition_versions(
    definition_code: str,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:
            cur.execute(
                """
                SELECT
                    definition_code,
                    version,
                    status,
                    definition_json,
                    published_at,
                    created_at,
                    updated_at
                FROM workflow_definition_versions
                WHERE definition_code = %s
                ORDER BY version DESC
                """,
                (definition_code,),
            )

            return cur.fetchall()


def create_definition(
    definition_code: str,
    name: str,
    description: str | None = None,
    status: str = "ACTIVE",
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:
            cur.execute(
                """
                INSERT INTO workflow_definitions
                (
                    definition_code,
                    name,
                    description,
                    status
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    definition_code,
                    name,
                    description,
                    status,
                ),
            )

            return cur.fetchone()


def create_definition_version(
    definition_code: str,
    version: int,
    definition_json: dict,
    status: str = "DRAFT",
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:
            cur.execute(
                """
                INSERT INTO workflow_definition_versions
                (
                    definition_code,
                    version,
                    status,
                    definition_json
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    definition_code,
                    version,
                    status,
                    psycopg2.extras.Json(definition_json),
                ),
            )

            return cur.fetchone()


def publish_definition_version(
    definition_code: str,
    version: int,
):
    with get_conn() as conn:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor,
        ) as cur:
            cur.execute(
                """
                UPDATE workflow_definition_versions
                SET
                    status = 'DEPRECATED',
                    updated_at = now()
                WHERE definition_code = %s
                  AND status = 'PUBLISHED'
                """,
                (
                    definition_code,
                ),
            )

            cur.execute(
                """
                UPDATE workflow_definition_versions
                SET
                    status = 'PUBLISHED',
                    published_at = now(),
                    updated_at = now()
                WHERE definition_code = %s
                  AND version = %s
                RETURNING *
                """,
                (
                    definition_code,
                    version,
                ),
            )

            return cur.fetchone()
