CREATE TABLE IF NOT EXISTS suspended_portal_profiles (
    id SERIAL PRIMARY KEY,
    profile_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    portal_url VARCHAR(255) NOT NULL,
    whatsapp_url VARCHAR(255),
    telegram_url VARCHAR(255),
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO suspended_portal_profiles (
    profile_code,
    name,
    portal_url,
    whatsapp_url,
    telegram_url,
    support_email,
    support_phone,
    active
)
VALUES (
    'SPEEDNET_DEFAULT',
    'Speednet Servizio Sospeso',
    'https://proximity.speednetwifi.it/suspended',
    'https://wa.me/390000000000',
    'https://t.me/speednetwifi',
    'assistenza@speednetwifi.it',
    '+39 000 0000000',
    true
)
ON CONFLICT (profile_code)
DO UPDATE SET
    name = EXCLUDED.name,
    portal_url = EXCLUDED.portal_url,
    whatsapp_url = EXCLUDED.whatsapp_url,
    telegram_url = EXCLUDED.telegram_url,
    support_email = EXCLUDED.support_email,
    support_phone = EXCLUDED.support_phone,
    active = EXCLUDED.active,
    updated_at = now();
