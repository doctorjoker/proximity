-- ============================================================
-- EUREKA 12.2.4
-- Workflow Studio Persistence Foundation
-- Schema reale con ID INTEGER
-- ============================================================

ALTER TABLE procedure_phases
ADD COLUMN IF NOT EXISTS position_x INTEGER NOT NULL DEFAULT 120;

ALTER TABLE procedure_phases
ADD COLUMN IF NOT EXISTS position_y INTEGER NOT NULL DEFAULT 120;


CREATE TABLE IF NOT EXISTS procedure_phase_transitions (
    id BIGSERIAL PRIMARY KEY,

    version_id INTEGER NOT NULL
        REFERENCES procedure_versions(id)
        ON DELETE CASCADE,

    source_phase_id INTEGER NOT NULL
        REFERENCES procedure_phases(id)
        ON DELETE CASCADE,

    target_phase_id INTEGER NOT NULL
        REFERENCES procedure_phases(id)
        ON DELETE CASCADE,

    transition_type VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',

    label VARCHAR(120),

    sort_order INTEGER NOT NULL DEFAULT 0,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_transition_different_phases
        CHECK (source_phase_id <> target_phase_id),

    CONSTRAINT uq_procedure_phase_transition
        UNIQUE (
            version_id,
            source_phase_id,
            target_phase_id,
            transition_type
        )
);


CREATE INDEX IF NOT EXISTS idx_phase_transition_version
ON procedure_phase_transitions(version_id);

CREATE INDEX IF NOT EXISTS idx_phase_transition_source
ON procedure_phase_transitions(source_phase_id);

CREATE INDEX IF NOT EXISTS idx_phase_transition_target
ON procedure_phase_transitions(target_phase_id);
