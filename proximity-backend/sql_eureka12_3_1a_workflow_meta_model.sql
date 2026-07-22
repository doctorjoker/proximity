BEGIN;

ALTER TABLE procedure_phases
    ADD COLUMN IF NOT EXISTS category VARCHAR(64);

-- Historical model: functional domain was stored inside `type`.
UPDATE procedure_phases
SET
    category = COALESCE(NULLIF(UPPER(TRIM(category)), ''), UPPER(TRIM(type))),
    type = 'ACTION',
    updated_at = now()
WHERE UPPER(TRIM(type)) IN (
    'VALIDATION',
    'INVENTORY',
    'ACS',
    'ASSURANCE',
    'OSS',
    'EVENT',
    'SYSTEM',
    'CUSTOM'
)
AND UPPER(TRIM(type)) NOT IN ('START', 'ACTION', 'DECISION', 'WAIT', 'END');

-- Normalize known BPM values that may have mixed casing, such as "Action".
UPDATE procedure_phases
SET
    type = UPPER(TRIM(type)),
    category = COALESCE(
        NULLIF(UPPER(TRIM(category)), ''),
        CASE
            WHEN UPPER(TRIM(type)) IN ('START', 'DECISION', 'WAIT', 'END') THEN 'SYSTEM'
            ELSE 'CUSTOM'
        END
    ),
    action = COALESCE(NULLIF(TRIM(action), ''), 'noop'),
    updated_at = now()
WHERE UPPER(TRIM(type)) IN ('START', 'ACTION', 'DECISION', 'WAIT', 'END');

-- Unknown historical values remain executable ACTION nodes, while preserving
-- their original value as category for traceability.
UPDATE procedure_phases
SET
    category = COALESCE(NULLIF(UPPER(TRIM(category)), ''), UPPER(TRIM(type)), 'CUSTOM'),
    type = 'ACTION',
    action = COALESCE(NULLIF(TRIM(action), ''), 'noop'),
    updated_at = now()
WHERE type IS NULL
   OR UPPER(TRIM(type)) NOT IN ('START', 'ACTION', 'DECISION', 'WAIT', 'END');

ALTER TABLE procedure_phases
    ALTER COLUMN category SET DEFAULT 'CUSTOM';

UPDATE procedure_phases
SET category = 'CUSTOM'
WHERE category IS NULL OR TRIM(category) = '';

ALTER TABLE procedure_phases
    ALTER COLUMN category SET NOT NULL;

COMMIT;
