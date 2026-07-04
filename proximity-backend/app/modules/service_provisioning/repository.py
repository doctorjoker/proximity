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
                    service_code,
                    customer_id,
                    customer_name,
                    plan_name,
                    vlan_id,
                    ppp_username,
                    ppp_password
                FROM customer_services
                WHERE service_code=:service_code
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
                vlan_id=row.get("vlan_id"),
            ),
            device=DeviceContext(),
            ppp=PPPContext(
                username=row.get("ppp_username"),
                password=row.get("ppp_password"),
            ),
            wifi=WiFiContext(),
            voip=VoIPContext(),
        )

    finally:
        db.close()
