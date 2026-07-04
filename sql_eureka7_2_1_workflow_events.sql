CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_code VARCHAR(50) NOT NULL,
    operation_code VARCHAR(50),

    event_time TIMESTAMP NOT NULL DEFAULT now(),

    event_type VARCHAR(50) NOT NULL,
    event_status VARCHAR(20) NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    duration_ms INTEGER,

    worker_name VARCHAR(100),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow_code
ON workflow_events(workflow_code);

CREATE INDEX IF NOT EXISTS idx_workflow_events_event_time
ON workflow_events(event_time);

CREATE INDEX IF NOT EXISTS idx_workflow_events_event_type
ON workflow_events(event_type);

CREATE INDEX IF NOT EXISTS idx_workflow_events_event_status
ON workflow_events(event_status);
