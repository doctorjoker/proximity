CREATE TABLE IF NOT EXISTS service_workflows (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_code VARCHAR(32) UNIQUE NOT NULL,

    workflow_type VARCHAR(64) NOT NULL,

    service_code VARCHAR(64) NOT NULL,

    acs_device_id TEXT,

    status VARCHAR(32) NOT NULL,

    current_step VARCHAR(64),

    progress INTEGER DEFAULT 0,

    payload JSONB,

    result JSONB,

    error_code TEXT,

    error_message TEXT,

    started_at TIMESTAMP DEFAULT now(),

    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT now(),

    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_workflow_service
ON service_workflows(service_code);

CREATE INDEX idx_workflow_status
ON service_workflows(status);
