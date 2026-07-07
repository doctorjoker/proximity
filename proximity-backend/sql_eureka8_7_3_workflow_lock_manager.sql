CREATE TABLE IF NOT EXISTS workflow_execution_locks
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_code VARCHAR(50) NOT NULL,

    resource_type VARCHAR(50) NOT NULL,

    resource_id VARCHAR(255) NOT NULL,

    acquired_at TIMESTAMP NOT NULL DEFAULT now(),

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_workflow_lock
        UNIQUE(resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_locks_workflow
ON workflow_execution_locks(workflow_code);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_locks_expires
ON workflow_execution_locks(expires_at);
