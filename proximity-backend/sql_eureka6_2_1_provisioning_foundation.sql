CREATE TABLE IF NOT EXISTS customer_services (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    service_type VARCHAR(50) NOT NULL DEFAULT 'INTERNET',
    access_type VARCHAR(50) DEFAULT 'FTTH',
    plan_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    pppoe_username VARCHAR(255),
    pppoe_password VARCHAR(255),
    vlan INTEGER,
    source_system VARCHAR(50) DEFAULT 'WFM',
    source_order_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_bindings (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(50) REFERENCES customer_services(service_code),
    acs_device_id VARCHAR(255),
    serial_number VARCHAR(255),
    vendor VARCHAR(100),
    model VARCHAR(100),
    binding_status VARCHAR(50) DEFAULT 'BOUND',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
    id SERIAL PRIMARY KEY,
    job_code VARCHAR(50) UNIQUE NOT NULL,
    service_code VARCHAR(50) REFERENCES customer_services(service_code),
    job_type VARCHAR(50) DEFAULT 'INTERNET_PROVISIONING',
    state VARCHAR(50) DEFAULT 'CREATED',
    requested_by VARCHAR(100),
    result JSONB,
    created_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP NULL
);
