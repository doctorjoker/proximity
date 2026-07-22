BEGIN;

CREATE TABLE IF NOT EXISTS procedure_execution_phases (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT NOT NULL REFERENCES procedure_executions(id) ON DELETE CASCADE,
    phase_key VARCHAR(160) NOT NULL,
    phase_name VARCHAR(255) NOT NULL,
    phase_order INTEGER,
    handler_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT,
    input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT procedure_execution_phases_status_check
        CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')),
    CONSTRAINT procedure_execution_phases_execution_phase_key_unique
        UNIQUE (execution_id, phase_key)
);

CREATE INDEX IF NOT EXISTS idx_procedure_execution_phases_execution_id
    ON procedure_execution_phases (execution_id);

CREATE INDEX IF NOT EXISTS idx_procedure_execution_phases_execution_order
    ON procedure_execution_phases (execution_id, phase_order, id);

CREATE INDEX IF NOT EXISTS idx_procedure_execution_phases_status
    ON procedure_execution_phases (status);

COMMIT;
