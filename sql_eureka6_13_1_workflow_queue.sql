CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workflow_execution_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_code VARCHAR(32) NOT NULL,

    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',

    priority INTEGER NOT NULL DEFAULT 100,

    scheduled_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),

    started_at TIMESTAMP WITHOUT TIME ZONE NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE NULL,

    retry_count INTEGER NOT NULL DEFAULT 0,

    worker_id VARCHAR(128) NULL,

    last_error TEXT NULL,

    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_workflow_code
ON workflow_execution_queue (workflow_code);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_status
ON workflow_execution_queue (status);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_scheduled_at
ON workflow_execution_queue (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_priority
ON workflow_execution_queue (priority);
