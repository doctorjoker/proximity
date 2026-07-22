UPDATE workflow_definition_versions
SET
    definition_json = '{
        "steps": [
            {
                "name": "BINDING",
                "progress": 20,
                "handler": "first_service_bind_device"
            },
            {
                "name": "PROVISIONING",
                "progress": 60,
                "handler": "first_service_apply_configuration"
            },
            {
                "name": "VERIFY",
                "progress": 90,
                "handler": "first_service_verify_service"
            }
        ]
    }'::jsonb,
    updated_at = now()
WHERE definition_code = 'FIRST_SERVICE_PROVISIONING'
  AND version = 1;

INSERT INTO workflow_definitions
(
    definition_code,
    name,
    description,
    status
)
VALUES
(
    'ROUTER_REPLACEMENT',
    'Router Replacement',
    'Router replacement workflow with binding, availability wait, restore and verification',
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
    'ROUTER_REPLACEMENT',
    1,
    'PUBLISHED',
    '{
        "steps": [
            {
                "name": "BINDING",
                "progress": 20,
                "handler": "replace_authorized_device"
            },
            {
                "name": "WAIT_ROUTER",
                "progress": 40,
                "handler": "wait_router_available"
            },
            {
                "name": "RESTORE",
                "progress": 70,
                "handler": "restore_customer_service_configuration"
            },
            {
                "name": "VERIFY",
                "progress": 90,
                "handler": "verify_customer_service"
            }
        ]
    }'::jsonb,
    now()
)
ON CONFLICT (definition_code, version)
DO UPDATE SET
    status = EXCLUDED.status,
    definition_json = EXCLUDED.definition_json,
    published_at = EXCLUDED.published_at,
    updated_at = now();
