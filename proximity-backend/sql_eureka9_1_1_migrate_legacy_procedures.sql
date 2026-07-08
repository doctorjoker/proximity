BEGIN;

INSERT INTO procedure_definitions (
    code,
    name,
    category,
    trigger_type,
    owner,
    status,
    description
)
VALUES
(
    'DEVICE_REBOOT',
    'Riavvio router',
    'Assurance',
    'Manuale / NOC',
    'Proximity Operations',
    'ACTIVE',
    'Riavvio remoto controllato del router cliente.'
),
(
    'FIRST_SERVICE_PROVISIONING',
    'Prima attivazione servizio',
    'Provisioning',
    'Manuale / WFM',
    'Proximity Operations',
    'ACTIVE',
    'Provisioning iniziale di un nuovo servizio cliente.'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type,
    owner = EXCLUDED.owner,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO procedure_versions (
    definition_id,
    version,
    status,
    base_version,
    notes,
    created_by,
    published_at
)
SELECT
    d.id,
    'v1.0',
    'ACTIVE',
    NULL,
    'Versione iniziale migrata dal Workflow Engine legacy.',
    'System Migration',
    now()
FROM procedure_definitions d
WHERE d.code IN ('DEVICE_REBOOT', 'FIRST_SERVICE_PROVISIONING')
ON CONFLICT (definition_id, version) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO procedure_versions (
    definition_id,
    version,
    status,
    base_version,
    notes,
    created_by,
    published_at
)
SELECT
    d.id,
    'v1.1',
    'DRAFT',
    'v1.0',
    'Bozza tecnica per evoluzione procedura.',
    'System Migration',
    NULL
FROM procedure_definitions d
WHERE d.code = 'FIRST_SERVICE_PROVISIONING'
ON CONFLICT (definition_id, version) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = now();

UPDATE procedure_definitions d
SET updated_at = now()
WHERE d.code IN ('DEVICE_REBOOT', 'FIRST_SERVICE_PROVISIONING');

COMMIT;
