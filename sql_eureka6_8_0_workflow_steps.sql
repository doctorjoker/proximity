CREATE TABLE IF NOT EXISTS workflow_steps
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_code VARCHAR(32) NOT NULL,

    step_name VARCHAR(64) NOT NULL,

    status VARCHAR(32) NOT NULL,

    started_at TIMESTAMP NOT NULL DEFAULT now(),

    completed_at TIMESTAMP,

    duration_ms INTEGER,

    input JSONB,

    output JSONB,

    error_code TEXT,

    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow
ON workflow_steps(workflow_code);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_status
ON workflow_steps(status);
