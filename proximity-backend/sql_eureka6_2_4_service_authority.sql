ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS commercial_status VARCHAR(50) DEFAULT 'ACTIVE';

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS provisioning_profile VARCHAR(50) DEFAULT 'INTERNET_FULL';

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS provisioning_allowed BOOLEAN DEFAULT true;

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS authority_source VARCHAR(50) DEFAULT 'LOCAL';

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS authority_status VARCHAR(50) DEFAULT 'ACTIVE';

ALTER TABLE customer_services
ADD COLUMN IF NOT EXISTS authority_checked_at TIMESTAMP NULL;
