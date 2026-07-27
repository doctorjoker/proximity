BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- EUREKA 14.0.1
-- Provisioning Profiles SQL Foundation
-- ============================================================


-- ============================================================
-- 1. Configuration Type Catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS provisioning_configuration_types (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code               varchar(50) NOT NULL,
    name                    varchar(120) NOT NULL,
    description             text,
    restore_handler         varchar(120),
    verify_handler          varchar(120),
    schema_definition       jsonb NOT NULL DEFAULT '{}'::jsonb,
    active                  boolean NOT NULL DEFAULT true,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_provisioning_configuration_types_code
        UNIQUE (type_code),

    CONSTRAINT ck_provisioning_configuration_types_code
        CHECK (type_code = upper(type_code)),

    CONSTRAINT ck_provisioning_configuration_types_schema_object
        CHECK (jsonb_typeof(schema_definition) = 'object'),

    CONSTRAINT ck_provisioning_configuration_types_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE provisioning_configuration_types IS
'Catalogo dei tipi di configurazione gestibili da Proximity.';

COMMENT ON COLUMN provisioning_configuration_types.restore_handler IS
'Identificatore logico dell''handler che applica la configurazione.';

COMMENT ON COLUMN provisioning_configuration_types.verify_handler IS
'Identificatore logico del verifier che controlla la configurazione.';


-- ============================================================
-- 2. Logical Provisioning Profile Catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS provisioning_profiles (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_code            varchar(100) NOT NULL,
    name                    varchar(180) NOT NULL,
    description             text,
    technology              varchar(50) NOT NULL,
    vendor_scope            varchar(120),
    active                  boolean NOT NULL DEFAULT true,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_provisioning_profiles_code
        UNIQUE (profile_code),

    CONSTRAINT ck_provisioning_profiles_code
        CHECK (profile_code = upper(profile_code)),

    CONSTRAINT ck_provisioning_profiles_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE provisioning_profiles IS
'Catalogo logico dei profili tecnici di provisioning.';

COMMENT ON COLUMN provisioning_profiles.vendor_scope IS
'Vincolo vendor opzionale. NULL indica un profilo vendor-independent.';


-- ============================================================
-- 3. Versioned Provisioning Profile Definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS provisioning_profile_versions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id              uuid NOT NULL,
    version                 integer NOT NULL,
    status                  varchar(20) NOT NULL DEFAULT 'DRAFT',
    is_current              boolean NOT NULL DEFAULT false,
    procedure_code          varchar(120),
    procedure_version       varchar(50),
    notes                   text,
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by              varchar(120),
    published_by            varchar(120),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    published_at            timestamptz,

    CONSTRAINT fk_provisioning_profile_versions_profile
        FOREIGN KEY (profile_id)
        REFERENCES provisioning_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_provisioning_profile_versions
        UNIQUE (profile_id, version),

    CONSTRAINT ck_provisioning_profile_versions_version
        CHECK (version > 0),

    CONSTRAINT ck_provisioning_profile_versions_status
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'DEPRECATED')),

    CONSTRAINT ck_provisioning_profile_versions_current
        CHECK (
            is_current = false
            OR status = 'PUBLISHED'
        ),

    CONSTRAINT ck_provisioning_profile_versions_procedure
        CHECK (
            (procedure_code IS NULL AND procedure_version IS NULL)
            OR
            (procedure_code IS NOT NULL AND procedure_version IS NOT NULL)
        ),

    CONSTRAINT ck_provisioning_profile_versions_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_provisioning_profile_current_version
    ON provisioning_profile_versions(profile_id)
    WHERE is_current = true;

COMMENT ON TABLE provisioning_profile_versions IS
'Definizioni versionate e pubblicabili dei Provisioning Profile.';

COMMENT ON COLUMN provisioning_profile_versions.is_current IS
'Indica la versione pubblicata utilizzata per le nuove assegnazioni.';


-- ============================================================
-- 4. Version Items
-- ============================================================

CREATE TABLE IF NOT EXISTS provisioning_profile_items (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_version_id          uuid NOT NULL,
    item_code                   varchar(100) NOT NULL,
    configuration_type_code     varchar(50) NOT NULL,
    template_payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
    required                    boolean NOT NULL DEFAULT true,
    enabled                     boolean NOT NULL DEFAULT true,
    sort_order                  integer NOT NULL DEFAULT 0,
    metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_provisioning_profile_items_version
        FOREIGN KEY (profile_version_id)
        REFERENCES provisioning_profile_versions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_provisioning_profile_items_configuration_type
        FOREIGN KEY (configuration_type_code)
        REFERENCES provisioning_configuration_types(type_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_provisioning_profile_items_code
        UNIQUE (profile_version_id, item_code),

    CONSTRAINT ck_provisioning_profile_items_code
        CHECK (item_code = upper(item_code)),

    CONSTRAINT ck_provisioning_profile_items_sort_order
        CHECK (sort_order >= 0),

    CONSTRAINT ck_provisioning_profile_items_template_object
        CHECK (jsonb_typeof(template_payload) = 'object'),

    CONSTRAINT ck_provisioning_profile_items_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE provisioning_profile_items IS
'Configurazioni dichiarative appartenenti a una versione di profilo.';

COMMENT ON COLUMN provisioning_profile_items.template_payload IS
'Payload JSON contenente valori statici e placeholder risolti dal Builder.';


-- ============================================================
-- 5. Service/Profile Assignment Audit
-- ============================================================

CREATE TABLE IF NOT EXISTS provisioning_profile_assignments (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code                varchar(100) NOT NULL,
    profile_id                  uuid NOT NULL,
    profile_version_id          uuid NOT NULL,
    assignment_status           varchar(30) NOT NULL DEFAULT 'ASSIGNED',
    generation_status           varchar(30) NOT NULL DEFAULT 'PENDING',
    generation_number           integer NOT NULL DEFAULT 1,
    generated_configuration_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    assigned_by                 varchar(120),
    generated_by                varchar(120),
    assigned_at                 timestamptz NOT NULL DEFAULT now(),
    generated_at                timestamptz,
    error_code                  varchar(100),
    error_message               text,
    metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_provisioning_profile_assignments_profile
        FOREIGN KEY (profile_id)
        REFERENCES provisioning_profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_provisioning_profile_assignments_version
        FOREIGN KEY (profile_version_id)
        REFERENCES provisioning_profile_versions(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_provisioning_profile_assignment_generation
        UNIQUE (
            service_code,
            profile_version_id,
            generation_number
        ),

    CONSTRAINT ck_provisioning_profile_assignments_status
        CHECK (
            assignment_status IN (
                'ASSIGNED',
                'ACTIVE',
                'SUPERSEDED',
                'CANCELLED'
            )
        ),

    CONSTRAINT ck_provisioning_profile_generation_status
        CHECK (
            generation_status IN (
                'PENDING',
                'GENERATING',
                'GENERATED',
                'FAILED'
            )
        ),

    CONSTRAINT ck_provisioning_profile_generation_number
        CHECK (generation_number > 0),

    CONSTRAINT ck_provisioning_profile_generated_ids_array
        CHECK (jsonb_typeof(generated_configuration_ids) = 'array'),

    CONSTRAINT ck_provisioning_profile_assignments_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE provisioning_profile_assignments IS
'Storico delle versioni di profilo assegnate ai servizi e delle generazioni effettuate.';

COMMENT ON COLUMN provisioning_profile_assignments.service_code IS
'Codice stabile del servizio Proximity. La FK verrà collegata dopo la verifica definitiva dello schema customer_services.';


-- ============================================================
-- 6. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_provisioning_profiles_active
    ON provisioning_profiles(active);

CREATE INDEX IF NOT EXISTS idx_provisioning_profiles_technology
    ON provisioning_profiles(technology);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_versions_profile
    ON provisioning_profile_versions(profile_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_versions_status
    ON provisioning_profile_versions(status);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_items_version
    ON provisioning_profile_items(profile_version_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_items_type
    ON provisioning_profile_items(configuration_type_code);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_assignments_service
    ON provisioning_profile_assignments(service_code);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_assignments_profile
    ON provisioning_profile_assignments(profile_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_assignments_version
    ON provisioning_profile_assignments(profile_version_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_profile_assignments_generation_status
    ON provisioning_profile_assignments(generation_status);


-- ============================================================
-- 7. updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_provisioning_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provisioning_configuration_types_updated_at
    ON provisioning_configuration_types;

CREATE TRIGGER trg_provisioning_configuration_types_updated_at
BEFORE UPDATE ON provisioning_configuration_types
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_updated_at();


DROP TRIGGER IF EXISTS trg_provisioning_profiles_updated_at
    ON provisioning_profiles;

CREATE TRIGGER trg_provisioning_profiles_updated_at
BEFORE UPDATE ON provisioning_profiles
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_updated_at();


DROP TRIGGER IF EXISTS trg_provisioning_profile_versions_updated_at
    ON provisioning_profile_versions;

CREATE TRIGGER trg_provisioning_profile_versions_updated_at
BEFORE UPDATE ON provisioning_profile_versions
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_updated_at();


DROP TRIGGER IF EXISTS trg_provisioning_profile_items_updated_at
    ON provisioning_profile_items;

CREATE TRIGGER trg_provisioning_profile_items_updated_at
BEFORE UPDATE ON provisioning_profile_items
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_updated_at();


DROP TRIGGER IF EXISTS trg_provisioning_profile_assignments_updated_at
    ON provisioning_profile_assignments;

CREATE TRIGGER trg_provisioning_profile_assignments_updated_at
BEFORE UPDATE ON provisioning_profile_assignments
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_updated_at();


-- ============================================================
-- 8. Bootstrap Configuration Types
-- ============================================================

INSERT INTO provisioning_configuration_types (
    type_code,
    name,
    description,
    restore_handler,
    verify_handler
)
VALUES
    (
        'PPPOE',
        'PPPoE',
        'Credenziali e parametri della sessione PPPoE.',
        'pppoe',
        'pppoe'
    ),
    (
        'WIFI',
        'Wi-Fi',
        'Configurazione delle reti Wi-Fi del dispositivo.',
        'wifi',
        'wifi'
    ),
    (
        'VOIP',
        'VoIP',
        'Configurazione del servizio voce SIP.',
        'voip',
        'voip'
    ),
    (
        'VLAN',
        'VLAN',
        'Configurazione VLAN del servizio.',
        'vlan',
        'vlan'
    ),
    (
        'DNS',
        'DNS',
        'Configurazione dei resolver DNS.',
        'dns',
        'dns'
    ),
    (
        'IPV6',
        'IPv6',
        'Configurazione IPv6 e Prefix Delegation.',
        'ipv6',
        'ipv6'
    ),
    (
        'TR069',
        'TR-069',
        'Configurazione della gestione remota CWMP.',
        'tr069',
        'tr069'
    ),
    (
        'NTP',
        'NTP',
        'Configurazione dei server di sincronizzazione temporale.',
        'ntp',
        'ntp'
    ),
    (
        'QOS',
        'QoS',
        'Configurazione delle policy di Quality of Service.',
        'qos',
        'qos'
    ),
    (
        'FIREWALL',
        'Firewall',
        'Configurazione delle policy firewall.',
        'firewall',
        'firewall'
    ),
    (
        'CUSTOM',
        'Custom',
        'Configurazione estensibile gestita da handler dedicati.',
        NULL,
        NULL
    )
ON CONFLICT (type_code)
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    restore_handler = EXCLUDED.restore_handler,
    verify_handler = EXCLUDED.verify_handler,
    updated_at = now();

COMMIT;
