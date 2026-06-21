CREATE TABLE IF NOT EXISTS desired_service_configurations (
    id SERIAL PRIMARY KEY,

    service_code VARCHAR(50) NOT NULL,
    config_type VARCHAR(50) NOT NULL,

    source_system VARCHAR(50) DEFAULT 'PROXIMITY',
    source_reference VARCHAR(255),

    enabled BOOLEAN DEFAULT true,

    configuration JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    UNIQUE(service_code, config_type)
);
