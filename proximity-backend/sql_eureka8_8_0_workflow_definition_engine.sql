CREATE TABLE IF NOT EXISTS workflow_definitions
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    definition_code VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT now(),

    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_definition_versions
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    definition_code VARCHAR(100) NOT NULL,

    version INTEGER NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',

    definition_json JSONB NOT NULL,

    published_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT now(),

    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_workflow_definition_versions_definition
        FOREIGN KEY (definition_code)
        REFERENCES workflow_definitions(definition_code)
        ON DELETE CASCADE,

    CONSTRAINT uq_workflow_definition_version
        UNIQUE(definition_code, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_definition
ON workflow_definition_versions(definition_code);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_status
ON workflow_definition_versions(status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_definition_published_version
ON workflow_definition_versions(definition_code)
WHERE status = 'PUBLISHED';

INSERT INTO workflow_definitions
(
    definition_code,
    name,
    description,
    status
)
VALUES
(
    'FIRST_SERVICE_PROVISIONING',
    'First Service Provisioning',
    'Provisioning workflow for first customer service activation',
    'ACTIVE'
)
ON CONFLICT (definition_code)
DO NOTHING;

INSERT INTO workflow_definition_versions
(
    definition_code,
    version,
    status,
    definition_json,
    published_at
)
VALUES
(
    'FIRST_SERVICE_PROVISIONING',
    1,
    'PUBLISHED',
    '{
        "steps": [
            {
                "name": "BINDING",
                "progress": 20,
                "handler": "first_service_bind_device"
            },
            {
                "name": "PROVISIONING",
                "progress": 70,
                "handler": "first_service_apply_configuration"
            },
            {
                "name": "VERIFY",
                "progress": 90,
                "handler": "first_service_verify_service"
            }
        ]
    }'::jsonb,
    now()
)
ON CONFLICT (definition_code, version)
DO NOTHING;
