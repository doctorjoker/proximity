import os
import psycopg2
import psycopg2.extras

from app.core.config import settings


DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def list_procedures():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    d.id,
                    d.code,
                    d.name,
                    d.category,
                    d.trigger_type,
                    d.owner,
                    d.status,
                    d.description,
                    d.created_at,
                    d.updated_at,
                    av.version AS active_version,
                    dv.version AS draft_version,
                    COALESCE(vstats.version_count, 0) AS version_count
                FROM procedure_definitions d
                LEFT JOIN procedure_versions av ON av.id = d.active_version_id
                LEFT JOIN procedure_versions dv ON dv.id = d.draft_version_id
                LEFT JOIN (
                    SELECT definition_id, count(*) AS version_count
                    FROM procedure_versions
                    GROUP BY definition_id
                ) vstats ON vstats.definition_id = d.id
                ORDER BY d.updated_at DESC, d.created_at DESC
                LIMIT 200
            """)
            return cur.fetchall()


def get_procedure(code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    d.id,
                    d.code,
                    d.name,
                    d.category,
                    d.trigger_type,
                    d.owner,
                    d.status,
                    d.description,
                    d.created_at,
                    d.updated_at,
                    av.version AS active_version,
                    dv.version AS draft_version
                FROM procedure_definitions d
                LEFT JOIN procedure_versions av ON av.id = d.active_version_id
                LEFT JOIN procedure_versions dv ON dv.id = d.draft_version_id
                WHERE d.code = %s
            """, (code,))
            return cur.fetchone()


def create_procedure(data):
    payload = data.dict()
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO procedure_definitions (
                    code,
                    name,
                    category,
                    trigger_type,
                    owner,
                    status,
                    description
                )
                VALUES (
                    %(code)s,
                    %(name)s,
                    %(category)s,
                    %(trigger_type)s,
                    %(owner)s,
                    %(status)s,
                    %(description)s
                )
                ON CONFLICT (code)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    trigger_type = EXCLUDED.trigger_type,
                    owner = EXCLUDED.owner,
                    status = EXCLUDED.status,
                    description = EXCLUDED.description,
                    updated_at = now()
                RETURNING *
            """, payload)
            return cur.fetchone()


def list_versions(code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    v.*,
                    d.code AS procedure_code,
                    d.name AS procedure_name,
                    COALESCE(pstats.phase_count, 0) AS phase_count,
                    COALESCE(varstats.variable_count, 0) AS variable_count
                FROM procedure_versions v
                JOIN procedure_definitions d ON d.id = v.definition_id
                LEFT JOIN (
                    SELECT version_id, count(*) AS phase_count
                    FROM procedure_phases
                    GROUP BY version_id
                ) pstats ON pstats.version_id = v.id
                LEFT JOIN (
                    SELECT version_id, count(*) AS variable_count
                    FROM procedure_variables
                    GROUP BY version_id
                ) varstats ON varstats.version_id = v.id
                WHERE d.code = %s
                ORDER BY v.created_at DESC
            """, (code,))
            return cur.fetchall()


def get_version(code: str, version: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    v.*,
                    d.code AS procedure_code,
                    d.name AS procedure_name,
                    d.category,
                    d.trigger_type,
                    d.owner
                FROM procedure_versions v
                JOIN procedure_definitions d ON d.id = v.definition_id
                WHERE d.code = %s
                  AND v.version = %s
            """, (code, version))
            return cur.fetchone()


def get_version_id(code: str, version: str):
    item = get_version(code, version)
    return item["id"] if item else None


def list_phases(code: str, version: str):
    version_id = get_version_id(code, version)
    if not version_id:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC
            """, (version_id,))
            return cur.fetchall()


def list_variables(code: str, version: str):
    version_id = get_version_id(code, version)
    if not version_id:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM procedure_variables
                WHERE version_id = %s
                ORDER BY scope ASC, name ASC
            """, (version_id,))
            return cur.fetchall()


def get_version_detail(code: str, version: str):
    item = get_version(code, version)
    if not item:
        return None

    phases = list_phases(code, version) or []
    variables = list_variables(code, version) or []

    return {
        "version": item,
        "phases": phases,
        "variables": variables,
    }


def get_designer(code: str, version: str):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC
            """, (version_item["id"],))
            phases = cur.fetchall()

            cur.execute("""
                SELECT *
                FROM procedure_phase_transitions
                WHERE version_id = %s
                ORDER BY sort_order ASC, id ASC
            """, (version_item["id"],))
            transitions = cur.fetchall()

            cur.execute("""
                SELECT *
                FROM procedure_variables
                WHERE version_id = %s
                ORDER BY scope ASC, name ASC
            """, (version_item["id"],))
            variables = cur.fetchall()

    nodes = []
    for phase in phases:
        phase_data = dict(phase)
        nodes.append({
            "id": str(phase_data["id"]),
            "position": {
                "x": float(phase_data.get("position_x") or 120),
                "y": float(phase_data.get("position_y") or 120),
            },
            "data": phase_data,
        })

    edges = []
    for transition in transitions:
        transition_data = dict(transition)
        edges.append({
            "id": str(transition_data["id"]),
            "source": str(transition_data["source_phase_id"]),
            "target": str(transition_data["target_phase_id"]),
            "transition_type": transition_data["transition_type"],
            "label": transition_data.get("label"),
            "sort_order": transition_data.get("sort_order", 0),
            "metadata": transition_data.get("metadata") or {},
        })

    return {
        "version": version_item,
        "nodes": nodes,
        "edges": edges,
        "variables": variables,
    }


def save_designer(code: str, version: str, payload):
    version_item = get_version(code, version)
    if not version_item:
        return None

    version_id = version_item["id"]
    payload_data = payload.dict()
    nodes = payload_data.get("nodes", [])
    edges = payload_data.get("edges", [])

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT id
                FROM procedure_phases
                WHERE version_id = %s
            """, (version_id,))
            valid_phase_ids = {row["id"] for row in cur.fetchall()}

            for node in nodes:
                try:
                    phase_id = int(node["id"])
                except (TypeError, ValueError):
                    raise ValueError(f"Invalid phase id: {node.get('id')}")

                if phase_id not in valid_phase_ids:
                    raise ValueError(
                        f"Phase {phase_id} does not belong to version {version}"
                    )

                position = node.get("position") or {}
                cur.execute("""
                    UPDATE procedure_phases
                    SET
                        position_x = %s,
                        position_y = %s
                    WHERE id = %s
                      AND version_id = %s
                """, (
                    round(float(position.get("x", 120))),
                    round(float(position.get("y", 120))),
                    phase_id,
                    version_id,
                ))

            cur.execute("""
                DELETE FROM procedure_phase_transitions
                WHERE version_id = %s
            """, (version_id,))

            for edge in edges:
                try:
                    source_phase_id = int(edge["source"])
                    target_phase_id = int(edge["target"])
                except (TypeError, ValueError):
                    raise ValueError("Edge source and target must be valid phase ids")

                if source_phase_id not in valid_phase_ids:
                    raise ValueError(
                        f"Source phase {source_phase_id} does not belong to version {version}"
                    )
                if target_phase_id not in valid_phase_ids:
                    raise ValueError(
                        f"Target phase {target_phase_id} does not belong to version {version}"
                    )
                if source_phase_id == target_phase_id:
                    raise ValueError("A transition cannot point to the same phase")

                cur.execute("""
                    INSERT INTO procedure_phase_transitions (
                        version_id,
                        source_phase_id,
                        target_phase_id,
                        transition_type,
                        label,
                        sort_order,
                        metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                """, (
                    version_id,
                    source_phase_id,
                    target_phase_id,
                    edge.get("transition_type") or "SUCCESS",
                    edge.get("label"),
                    edge.get("sort_order", 0),
                    psycopg2.extras.Json(edge.get("metadata") or {}),
                ))

    return get_designer(code, version)


def create_test_execution(code: str, version: str, payload):
    version_item = get_version(code, version)
    if not version_item:
        return None

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO procedure_executions (
                    execution_code,
                    definition_id,
                    version_id,
                    status,
                    input_payload,
                    output_payload,
                    requested_by,
                    started_at,
                    completed_at
                )
                VALUES (
                    'TMP',
                    %(definition_id)s,
                    %(version_id)s,
                    'COMPLETED',
                    %(input_payload)s::jsonb,
                    %(output_payload)s::jsonb,
                    %(requested_by)s,
                    now(),
                    now()
                )
                RETURNING *
            """, {
                "definition_id": version_item["definition_id"],
                "version_id": version_item["id"],
                "input_payload": psycopg2.extras.Json(payload.input),
                "output_payload": psycopg2.extras.Json({
                    "success": True,
                    "result": "SUCCESS",
                    "mode": "backend-foundation",
                }),
                "requested_by": payload.requested_by,
            })
            execution = cur.fetchone()
            execution_code = f"PEX-{execution['id']:06d}"

            cur.execute("""
                UPDATE procedure_executions
                SET execution_code = %s
                WHERE id = %s
                RETURNING *
            """, (execution_code, execution["id"]))
            execution = cur.fetchone()

            cur.execute("""
                INSERT INTO procedure_execution_logs (
                    execution_id,
                    phase_order,
                    phase_name,
                    status,
                    message,
                    duration_ms
                )
                SELECT
                    %s,
                    phase_order,
                    name,
                    'OK',
                    'Foundation test simulated by backend',
                    100 + (phase_order * 25)
                FROM procedure_phases
                WHERE version_id = %s
                ORDER BY phase_order ASC
            """, (execution["id"], version_item["id"]))

            return execution


def list_execution_logs(execution_code: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT l.*
                FROM procedure_execution_logs l
                JOIN procedure_executions e ON e.id = l.execution_id
                WHERE e.execution_code = %s
                ORDER BY l.created_at ASC, l.phase_order ASC
            """, (execution_code,))
            return cur.fetchall()
