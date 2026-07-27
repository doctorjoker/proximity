BEGIN;

-- ============================================================
-- EUREKA 14.0.1a
-- provisioning_profile_items.configuration_key
-- ============================================================

ALTER TABLE provisioning_profile_items
ADD COLUMN IF NOT EXISTS configuration_key varchar(100);

UPDATE provisioning_profile_items
SET configuration_key = item_code
WHERE configuration_key IS NULL;

ALTER TABLE provisioning_profile_items
ALTER COLUMN configuration_key SET NOT NULL;

ALTER TABLE provisioning_profile_items
ADD CONSTRAINT uq_provisioning_profile_item_key
UNIQUE (
    profile_version_id,
    configuration_type_code,
    configuration_key
);

COMMENT ON COLUMN provisioning_profile_items.configuration_key IS
'Logical configuration key (username, password, ssid, vlan, sip_server, ecc.).';

COMMIT;
