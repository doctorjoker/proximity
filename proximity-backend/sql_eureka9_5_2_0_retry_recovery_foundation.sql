BEGIN;

ALTER TABLE procedure_execution_phases
    ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS retry_delay_ms integer,
    ADD COLUMN IF NOT EXISTS retry_reason text,
    ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
    ADD COLUMN IF NOT EXISTS attempts_json jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_procedure_execution_phases_retry
    ON procedure_execution_phases (execution_id, status, next_retry_at);

COMMIT;
