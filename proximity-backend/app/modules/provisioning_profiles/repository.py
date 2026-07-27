from __future__ import annotations

import os
from typing import Any, Dict, Optional
from uuid import UUID

import psycopg2
import psycopg2.extras

from app.core.config import settings


DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def _json(value: Any):
    return psycopg2.extras.Json(value if value is not None else {})


def _dict(row):
    return dict(row) if row else None


def list_configuration_types(active_only: bool = True):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM provisioning_configuration_types
                WHERE (%s = false OR active = true)
                ORDER BY type_code
                """,
                (active_only,),
            )
            return [dict(row) for row in cur.fetchall()]


def get_configuration_type(type_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM provisioning_configuration_types WHERE type_code = %s",
                (type_code,),
            )
            return _dict(cur.fetchone())


def list_profiles(*, active: Optional[bool] = None, technology: Optional[str] = None):
    clauses = []
    params = []
    if active is not None:
        clauses.append("p.active = %s")
        params.append(active)
    if technology:
        clauses.append("p.technology = %s")
        params.append(technology)
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    p.*,
                    cv.id AS current_version_id,
                    cv.version AS current_version,
                    cv.procedure_code AS current_procedure_code,
                    cv.procedure_version AS current_procedure_version,
                    COALESCE(vs.version_count, 0) AS version_count
                FROM provisioning_profiles p
                LEFT JOIN provisioning_profile_versions cv
                  ON cv.profile_id = p.id AND cv.is_current = true
                LEFT JOIN (
                    SELECT profile_id, count(*) AS version_count
                    FROM provisioning_profile_versions
                    GROUP BY profile_id
                ) vs ON vs.profile_id = p.id
                {where}
                ORDER BY p.updated_at DESC, p.profile_code
                """,
                tuple(params),
            )
            return [dict(row) for row in cur.fetchall()]


def get_profile(profile_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    p.*,
                    cv.id AS current_version_id,
                    cv.version AS current_version,
                    cv.procedure_code AS current_procedure_code,
                    cv.procedure_version AS current_procedure_version,
                    COALESCE(vs.version_count, 0) AS version_count
                FROM provisioning_profiles p
                LEFT JOIN provisioning_profile_versions cv
                  ON cv.profile_id = p.id AND cv.is_current = true
                LEFT JOIN (
                    SELECT profile_id, count(*) AS version_count
                    FROM provisioning_profile_versions
                    GROUP BY profile_id
                ) vs ON vs.profile_id = p.id
                WHERE p.profile_code = %s
                """,
                (profile_code,),
            )
            return _dict(cur.fetchone())


def create_profile(data: Dict[str, Any]):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO provisioning_profiles (
                    profile_code, name, description, technology,
                    vendor_scope, active, metadata
                )
                VALUES (
                    %(profile_code)s, %(name)s, %(description)s, %(technology)s,
                    %(vendor_scope)s, %(active)s, %(metadata)s
                )
                RETURNING *
                """,
                {**data, "metadata": _json(data.get("metadata"))},
            )
            return _dict(cur.fetchone())


def update_profile(profile_code: str, changes: Dict[str, Any]):
    if not changes:
        return get_profile(profile_code)
    allowed = {"name", "description", "technology", "vendor_scope", "active", "metadata"}
    assignments = []
    params: Dict[str, Any] = {"profile_code": profile_code}
    for key, value in changes.items():
        if key in allowed:
            assignments.append(f"{key} = %({key})s")
            params[key] = _json(value) if key == "metadata" else value
    if not assignments:
        return get_profile(profile_code)

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE provisioning_profiles
                SET {", ".join(assignments)}
                WHERE profile_code = %(profile_code)s
                RETURNING *
                """,
                params,
            )
            return _dict(cur.fetchone())


def count_profile_assignments(profile_id: UUID) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM provisioning_profile_assignments WHERE profile_id = %s",
                (str(profile_id),),
            )
            return int(cur.fetchone()[0])


def count_non_draft_versions(profile_id: UUID) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT count(*) FROM provisioning_profile_versions
                WHERE profile_id = %s AND status <> 'DRAFT'
                """,
                (str(profile_id),),
            )
            return int(cur.fetchone()[0])


def delete_profile(profile_id: UUID) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM provisioning_profiles WHERE id = %s", (str(profile_id),))
            return cur.rowcount > 0


def list_versions(profile_id: UUID):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    v.*,
                    COALESCE(s.item_count, 0) AS item_count,
                    COALESCE(s.enabled_item_count, 0) AS enabled_item_count
                FROM provisioning_profile_versions v
                LEFT JOIN (
                    SELECT profile_version_id,
                           count(*) AS item_count,
                           count(*) FILTER (WHERE enabled = true) AS enabled_item_count
                    FROM provisioning_profile_items
                    GROUP BY profile_version_id
                ) s ON s.profile_version_id = v.id
                WHERE v.profile_id = %s
                ORDER BY v.version DESC
                """,
                (str(profile_id),),
            )
            return [dict(row) for row in cur.fetchall()]


def get_version(version_id: UUID):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    v.*,
                    p.profile_code,
                    p.name AS profile_name,
                    p.active AS profile_active,
                    COALESCE(s.item_count, 0) AS item_count,
                    COALESCE(s.enabled_item_count, 0) AS enabled_item_count
                FROM provisioning_profile_versions v
                JOIN provisioning_profiles p ON p.id = v.profile_id
                LEFT JOIN (
                    SELECT profile_version_id,
                           count(*) AS item_count,
                           count(*) FILTER (WHERE enabled = true) AS enabled_item_count
                    FROM provisioning_profile_items
                    GROUP BY profile_version_id
                ) s ON s.profile_version_id = v.id
                WHERE v.id = %s
                """,
                (str(version_id),),
            )
            return _dict(cur.fetchone())


def get_version_by_number(profile_id: UUID, version: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM provisioning_profile_versions
                WHERE profile_id = %s AND version = %s
                """,
                (str(profile_id), version),
            )
            return _dict(cur.fetchone())


def create_version(profile_id: UUID, data: Dict[str, Any]):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO provisioning_profile_versions (
                    profile_id, version, status, is_current,
                    procedure_code, procedure_version, notes, metadata, created_by
                )
                VALUES (
                    %(profile_id)s, %(version)s, 'DRAFT', false,
                    %(procedure_code)s, %(procedure_version)s, %(notes)s,
                    %(metadata)s, %(created_by)s
                )
                RETURNING *
                """,
                {**data, "profile_id": str(profile_id), "metadata": _json(data.get("metadata"))},
            )
            return _dict(cur.fetchone())


def procedure_version_exists(procedure_code: str, procedure_version: str) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM procedure_definitions d
                    JOIN procedure_versions v ON v.definition_id = d.id
                    WHERE d.code = %s AND v.version = %s
                )
                """,
                (procedure_code, procedure_version),
            )
            return bool(cur.fetchone()[0])


def publish_version(version_id: UUID, *, published_by: Optional[str], make_current: bool):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT profile_id FROM provisioning_profile_versions WHERE id = %s FOR UPDATE",
                (str(version_id),),
            )
            target = cur.fetchone()
            if not target:
                return None
            if make_current:
                cur.execute(
                    """
                    UPDATE provisioning_profile_versions
                    SET is_current = false
                    WHERE profile_id = %s AND is_current = true AND id <> %s
                    """,
                    (target["profile_id"], str(version_id)),
                )
            cur.execute(
                """
                UPDATE provisioning_profile_versions
                SET status = 'PUBLISHED',
                    is_current = %s,
                    published_by = %s,
                    published_at = COALESCE(published_at, now())
                WHERE id = %s
                RETURNING *
                """,
                (make_current, published_by, str(version_id)),
            )
            return _dict(cur.fetchone())


def deprecate_version(version_id: UUID, *, deprecated_by: Optional[str], replacement_version: Optional[int]):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE provisioning_profile_versions
                SET status = 'DEPRECATED',
                    is_current = false,
                    metadata = metadata || %s::jsonb
                WHERE id = %s
                RETURNING *
                """,
                (
                    psycopg2.extras.Json({
                        "deprecated_by": deprecated_by,
                        "replacement_version": replacement_version,
                    }),
                    str(version_id),
                ),
            )
            return _dict(cur.fetchone())


def list_items(version_id: UUID):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.*, ct.name AS configuration_type_name,
                       ct.restore_handler, ct.verify_handler,
                       ct.active AS configuration_type_active
                FROM provisioning_profile_items i
                JOIN provisioning_configuration_types ct
                  ON ct.type_code = i.configuration_type_code
                WHERE i.profile_version_id = %s
                ORDER BY i.sort_order, i.item_code
                """,
                (str(version_id),),
            )
            return [dict(row) for row in cur.fetchall()]


def get_item(item_id: UUID):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.*, v.status AS version_status, p.profile_code
                FROM provisioning_profile_items i
                JOIN provisioning_profile_versions v ON v.id = i.profile_version_id
                JOIN provisioning_profiles p ON p.id = v.profile_id
                WHERE i.id = %s
                """,
                (str(item_id),),
            )
            return _dict(cur.fetchone())


def create_item(version_id: UUID, data: Dict[str, Any]):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO provisioning_profile_items (
                    profile_version_id, item_code, configuration_type_code,
                    configuration_key, template_payload, required,
                    enabled, sort_order, metadata
                )
                VALUES (
                    %(profile_version_id)s, %(item_code)s, %(configuration_type_code)s,
                    %(configuration_key)s, %(template_payload)s, %(required)s,
                    %(enabled)s, %(sort_order)s, %(metadata)s
                )
                RETURNING *
                """,
                {
                    **data,
                    "profile_version_id": str(version_id),
                    "template_payload": _json(data.get("template_payload")),
                    "metadata": _json(data.get("metadata")),
                },
            )
            return _dict(cur.fetchone())


def update_item(item_id: UUID, changes: Dict[str, Any]):
    if not changes:
        return get_item(item_id)
    allowed = {
        "configuration_type_code", "configuration_key", "template_payload",
        "required", "enabled", "sort_order", "metadata",
    }
    assignments = []
    params: Dict[str, Any] = {"item_id": str(item_id)}
    for key, value in changes.items():
        if key in allowed:
            assignments.append(f"{key} = %({key})s")
            params[key] = _json(value) if key in {"template_payload", "metadata"} else value
    if not assignments:
        return get_item(item_id)

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE provisioning_profile_items
                SET {", ".join(assignments)}
                WHERE id = %(item_id)s
                RETURNING *
                """,
                params,
            )
            return _dict(cur.fetchone())


def delete_item(item_id: UUID) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM provisioning_profile_items WHERE id = %s", (str(item_id),))
            return cur.rowcount > 0
