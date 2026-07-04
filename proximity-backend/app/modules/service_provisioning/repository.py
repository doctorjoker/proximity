"""
EUREKA 8.0.0

Service Provisioning Repository
"""

from sqlalchemy import text

from app.db.session import SessionLocal

from .schemas import (
    ProvisioningContext,
    ServiceContext,
    DeviceContext,
    PPPContext,
    WiFiContext,
    VoIPContext,
)


def load_service_context(
    service_code: str,
):
    db = SessionLocal()

    try:
        row = db.execute(
            text(
                """
                SELECT
                    cs.service_code,
                    cs.customer_id,
                    cs.customer_name,
                    cs.plan_name,
                    cs.vlan,
                    cs.pppoe_username,
                    cs.pppoe_password,

                    cad.acs_device_id,
                    cad.serial_number,
                    cad.vendor,
                    cad.model
                FROM customer_services cs
                LEFT JOIN customer_assigned_devices cad
                    ON cad.service_code = cs.service_code
                    AND cad.device_role = 'ROUTER'
                WHERE cs.service_code=:service_code
                """
            ),
            {
                "service_code": service_code,
            },
        ).mappings().first()

        if row is None:
            return None

        return ProvisioningContext(
            service=ServiceContext(
                service_code=row["service_code"],
                customer_id=row.get("customer_id"),
                customer_name=row.get("customer_name"),
                plan_name=row.get("plan_name"),
                vlan_id=row.get("vlan"),
            ),
            device=DeviceContext(
                acs_device_id=row.get("acs_device_id"),
                serial_number=row.get("serial_number"),
                vendor=row.get("vendor"),
                model=row.get("model"),
            ),
            ppp=PPPContext(
                username=row.get("pppoe_username"),
                password=row.get("pppoe_password"),
            ),
            wifi=WiFiContext(),
            voip=VoIPContext(),
        )

    finally:
        db.close()
