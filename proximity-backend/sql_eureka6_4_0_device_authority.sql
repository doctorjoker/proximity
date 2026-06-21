CREATE TABLE IF NOT EXISTS customer_assigned_devices (
    id SERIAL PRIMARY KEY,

    service_code VARCHAR(50) NOT NULL,

    device_role VARCHAR(50) DEFAULT 'ROUTER',

    serial_number VARCHAR(255),
    mac_address VARCHAR(255),
    acs_device_id VARCHAR(255),

    vendor VARCHAR(100),
    model VARCHAR(100),

    assignment_status VARCHAR(50) DEFAULT 'ASSIGNED',
    provisioning_allowed BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    UNIQUE(service_code, device_role)
);
