CREATE TABLE IF NOT EXISTS procedure_definitions (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Provisioning',
    trigger_type TEXT NOT NULL DEFAULT 'Manuale / WFM',
    owner TEXT NOT NULL DEFAULT 'Proximity Operations',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    description TEXT,
    active_version_id INTEGER,
    draft_version_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedure_versions (
    id SERIAL PRIMARY KEY,
    definition_id INTEGER NOT NULL REFERENCES procedure_definitions(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    base_version TEXT,
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'Admin Proximity',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    UNIQUE(definition_id, version)
);

ALTER TABLE procedure_definitions
    DROP CONSTRAINT IF EXISTS procedure_definitions_active_version_fk;
ALTER TABLE procedure_definitions
    ADD CONSTRAINT procedure_definitions_active_version_fk
    FOREIGN KEY (active_version_id) REFERENCES procedure_versions(id) ON DELETE SET NULL;

ALTER TABLE procedure_definitions
    DROP CONSTRAINT IF EXISTS procedure_definitions_draft_version_fk;
ALTER TABLE procedure_definitions
    ADD CONSTRAINT procedure_definitions_draft_version_fk
    FOREIGN KEY (draft_version_id) REFERENCES procedure_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS procedure_phases (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES procedure_versions(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    action TEXT NOT NULL,
    type TEXT NOT NULL,
    timeout TEXT NOT NULL DEFAULT '30s',
    retry INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'READY',
    description TEXT,
    continue_on_error BOOLEAN NOT NULL DEFAULT false,
    success_transition TEXT,
    error_transition TEXT,
    input_variables TEXT,
    output_variables TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(version_id, phase_order)
);

CREATE TABLE IF NOT EXISTS procedure_variables (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES procedure_versions(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string',
    required BOOLEAN NOT NULL DEFAULT false,
    default_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(version_id, scope, name)
);

CREATE TABLE IF NOT EXISTS procedure_executions (
    id SERIAL PRIMARY KEY,
    execution_code TEXT UNIQUE,
    definition_id INTEGER NOT NULL REFERENCES procedure_definitions(id) ON DELETE CASCADE,
    version_id INTEGER NOT NULL REFERENCES procedure_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'CREATED',
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_by TEXT NOT NULL DEFAULT 'Admin Proximity',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedure_execution_logs (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES procedure_executions(id) ON DELETE CASCADE,
    phase_order INTEGER,
    phase_name TEXT,
    status TEXT NOT NULL DEFAULT 'OK',
    message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    'PROC-ROUTER-REPLACEMENT',
    'Sostituzione router cliente',
    'Provisioning',
    'Manuale / WFM',
    'Proximity Operations',
    'DRAFT',
    'Procedura automatica per sostituzione router cliente con provisioning ACS e verifica runtime.'
)
ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type,
    owner = EXCLUDED.owner,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    updated_at = now();

WITH d AS (
    SELECT id FROM procedure_definitions WHERE code = 'PROC-ROUTER-REPLACEMENT'
), inserted AS (
    INSERT INTO procedure_versions (
        definition_id,
        version,
        status,
        base_version,
        notes,
        created_by,
        published_at
    )
    SELECT id, 'v1.2', 'ACTIVE', 'v1.1', 'Versione stabile pubblicata per uso operativo.', 'Admin Proximity', now()
    FROM d
    ON CONFLICT (definition_id, version)
    DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        published_at = COALESCE(procedure_versions.published_at, EXCLUDED.published_at),
        updated_at = now()
    RETURNING id, definition_id
)
UPDATE procedure_definitions d
SET active_version_id = inserted.id,
    updated_at = now()
FROM inserted
WHERE d.id = inserted.definition_id;

WITH d AS (
    SELECT id FROM procedure_definitions WHERE code = 'PROC-ROUTER-REPLACEMENT'
), inserted AS (
    INSERT INTO procedure_versions (
        definition_id,
        version,
        status,
        base_version,
        notes,
        created_by
    )
    SELECT id, 'v1.3', 'DRAFT', 'v1.2', 'Aggiunta fase di verifica post-provisioning ACS.', 'Admin Proximity'
    FROM d
    ON CONFLICT (definition_id, version)
    DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = now()
    RETURNING id, definition_id
)
UPDATE procedure_definitions d
SET draft_version_id = inserted.id,
    updated_at = now()
FROM inserted
WHERE d.id = inserted.definition_id;

WITH v AS (
    SELECT pv.id
    FROM procedure_versions pv
    JOIN procedure_definitions pd ON pd.id = pv.definition_id
    WHERE pd.code = 'PROC-ROUTER-REPLACEMENT'
      AND pv.version = 'v1.3'
)
INSERT INTO procedure_phases (
    version_id,
    phase_order,
    name,
    action,
    type,
    timeout,
    retry,
    status,
    input_variables,
    output_variables
)
SELECT v.id, x.phase_order, x.name, x.action, x.type, x.timeout, x.retry, x.status, x.input_variables, x.output_variables
FROM v
CROSS JOIN (VALUES
    (1, 'Validazione servizio', 'validate_customer_service', 'Validation', '20s', 0, 'READY', 'SERVICE_CODE', 'RESULT'),
    (2, 'Verifica binding router', 'check_device_binding', 'Inventory', '20s', 1, 'READY', 'SERVICE_CODE\nACS_DEVICE_ID', 'RESULT'),
    (3, 'Provisioning PPPoE', 'acs_set_pppoe_credentials', 'ACS', '60s', 2, 'READY', 'ACS_DEVICE_ID\nSERVICE_CODE', 'RESULT\nERROR_CODE'),
    (4, 'Refresh parametri ACS', 'acs_refresh_parameters', 'ACS', '45s', 1, 'READY', 'ACS_DEVICE_ID', 'RESULT'),
    (5, 'Verifica runtime WAN', 'verify_wan_runtime_state', 'Assurance', '30s', 1, 'READY', 'ACS_DEVICE_ID', 'RESULT'),
    (6, 'Aggiorna stato servizio', 'update_service_status', 'OSS', '20s', 0, 'READY', 'SERVICE_CODE', 'RESULT'),
    (7, 'Notifica completamento', 'emit_workflow_event', 'Event', '15s', 0, 'DRAFT', 'SERVICE_CODE', 'RESULT')
) AS x(phase_order, name, action, type, timeout, retry, status, input_variables, output_variables)
ON CONFLICT (version_id, phase_order)
DO UPDATE SET
    name = EXCLUDED.name,
    action = EXCLUDED.action,
    type = EXCLUDED.type,
    timeout = EXCLUDED.timeout,
    retry = EXCLUDED.retry,
    status = EXCLUDED.status,
    input_variables = EXCLUDED.input_variables,
    output_variables = EXCLUDED.output_variables,
    updated_at = now();

WITH v AS (
    SELECT pv.id
    FROM procedure_versions pv
    JOIN procedure_definitions pd ON pd.id = pv.definition_id
    WHERE pd.code = 'PROC-ROUTER-REPLACEMENT'
      AND pv.version = 'v1.3'
)
INSERT INTO procedure_variables (
    version_id,
    scope,
    name,
    type,
    required,
    default_value,
    description
)
SELECT v.id, x.scope, x.name, x.type, x.required, x.default_value, x.description
FROM v
CROSS JOIN (VALUES
    ('Input', 'SERVICE_CODE', 'string', true, '', 'Codice servizio cliente'),
    ('Input', 'ACS_DEVICE_ID', 'string', true, '', 'Identificativo device GenieACS'),
    ('Input', 'CUSTOMER_ID', 'string', false, '', 'Identificativo cliente'),
    ('Secret', 'PPPOE_PASSWORD', 'secret', true, '***', 'Password PPPoE generata dal source of truth'),
    ('Output', 'RESULT', 'string', false, 'SUCCESS', 'Risultato finale procedura'),
    ('Output', 'ERROR_CODE', 'string', false, '', 'Codice errore normalizzato'),
    ('Output', 'ERROR_MESSAGE', 'string', false, '', 'Messaggio errore operativo')
) AS x(scope, name, type, required, default_value, description)
ON CONFLICT (version_id, scope, name)
DO UPDATE SET
    type = EXCLUDED.type,
    required = EXCLUDED.required,
    default_value = EXCLUDED.default_value,
    description = EXCLUDED.description,
    updated_at = now();
