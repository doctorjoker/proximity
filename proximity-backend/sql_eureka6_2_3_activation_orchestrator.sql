ALTER TABLE provisioning_jobs
ADD COLUMN workflow_state VARCHAR(50) DEFAULT 'CREATED';

ALTER TABLE provisioning_jobs
ADD COLUMN activation_status VARCHAR(50) DEFAULT 'PENDING';
