BEGIN;

CREATE TABLE IF NOT EXISTS procedure_executions (
    id BIGSERIAL PRIMARY KEY,
    execution_code TEXT UNIQUE,
    definition_id BIGINT,
    version_id BIGINT,
    procedure_code TEXT,
    procedure_version TEXT,
    workflow_code TEXT,
    workflow_type TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    mode TEXT NOT NULL DEFAULT 'TEST',
    requested_by TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE procedure_executions
    ADD COLUMN IF NOT EXISTS definition_id BIGINT,
    ADD COLUMN IF NOT EXISTS version_id BIGINT,
    ADD COLUMN IF NOT EXISTS procedure_code TEXT,
    ADD COLUMN IF NOT EXISTS procedure_version TEXT,
    ADD COLUMN IF NOT EXISTS workflow_code TEXT,
    ADD COLUMN IF NOT EXISTS workflow_type TEXT,
    ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'TEST',
    ADD COLUMN IF NOT EXISTS requested_by TEXT,
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_procedure_executions_procedure
    ON procedure_executions (procedure_code, procedure_version);

CREATE INDEX IF NOT EXISTS idx_procedure_executions_workflow_code
    ON procedure_executions (workflow_code);

CREATE INDEX IF NOT EXISTS idx_procedure_executions_requested_at
    ON procedure_executions (requested_at DESC);

COMMIT;
