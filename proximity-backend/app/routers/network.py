from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/network",
    tags=["network"],
)


@router.get("/health")
async def network_health():
    return {
        "success": True,
        "module": "network",
    }


@router.post("/build-links")
async def build_network_links(
    db: Session = Depends(get_db),
):
    """
    Foundation builder:
    customer_registry.radius_login <-> devices.pppoe_username

    This creates the first customer_network_links rows using ACS PPPoE.
    OLT/ONT enrichment will be added in the next step.
    """

    # Ensure table exists, so this endpoint fails clearly only if DB extensions are missing.
    exists = db.execute(
        text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'customer_network_links'
            )
        """)
    ).scalar()

    if not exists:
        raise HTTPException(
            status_code=500,
            detail="Table customer_network_links does not exist",
        )

    rows = db.execute(
        text("""
            SELECT
                d.id AS device_id,
                d.pppoe_username,
                c.id AS customer_registry_id
            FROM devices d
            JOIN customer_registry c
              ON LOWER(d.pppoe_username) = LOWER(c.radius_login)
            WHERE d.pppoe_username IS NOT NULL
              AND c.radius_login IS NOT NULL
        """)
    ).mappings().all()

    created = 0
    updated = 0

    for row in rows:
        existing = db.execute(
            text("""
                SELECT id
                FROM customer_network_links
                WHERE customer_registry_id = :customer_registry_id
                  AND device_id = :device_id
                  AND LOWER(COALESCE(pppoe_username, '')) = LOWER(:pppoe_username)
                LIMIT 1
            """),
            {
                "customer_registry_id": row["customer_registry_id"],
                "device_id": row["device_id"],
                "pppoe_username": row["pppoe_username"],
            },
        ).mappings().first()

        if existing:
            db.execute(
                text("""
                    UPDATE customer_network_links
                    SET
                        pppoe_username = :pppoe_username,
                        match_source = 'PPPOE_ACS',
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {
                    "id": existing["id"],
                    "pppoe_username": row["pppoe_username"],
                },
            )
            updated += 1
        else:
            db.execute(
                text("""
                    INSERT INTO customer_network_links (
                        customer_registry_id,
                        device_id,
                        pppoe_username,
                        match_source,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :customer_registry_id,
                        :device_id,
                        :pppoe_username,
                        'PPPOE_ACS',
                        NOW(),
                        NOW()
                    )
                """),
                {
                    "customer_registry_id": row["customer_registry_id"],
                    "device_id": row["device_id"],
                    "pppoe_username": row["pppoe_username"],
                },
            )
            created += 1

    db.commit()

    return {
        "success": True,
        "matched": len(rows),
        "created": created,
        "updated": updated,
    }


@router.get("/links")
async def list_network_links(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)

    rows = db.execute(
        text("""
            SELECT
                l.id,
                l.customer_registry_id,
                l.device_id,
                l.pppoe_username,
                l.ont_serial,
                l.olt_name,
                l.frame,
                l.slot,
                l.pon,
                l.ont_id,
                l.olt_rx_dbm,
                l.match_source,
                l.created_at,
                l.updated_at,

                c.customer_code,
                c.customer_name,
                c.contract_number,
                c.profile,
                c.address,
                c.civic_number,
                c.city,
                c.province,

                d.acs_device_id,
                d.device_code,
                d.manufacturer,
                d.model,
                d.serial_number,
                d.software_version,
                d.online,
                d.wan_ip,
                d.last_seen
            FROM customer_network_links l
            LEFT JOIN customer_registry c
              ON c.id = l.customer_registry_id
            LEFT JOIN devices d
              ON d.id = l.device_id
            ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        {
            "limit": limit,
            "offset": offset,
        },
    ).mappings().all()

    count = db.execute(
        text("""
            SELECT COUNT(*)
            FROM customer_network_links
        """)
    ).scalar()

    return {
        "success": True,
        "count": count,
        "limit": limit,
        "offset": offset,
        "items": [dict(row) for row in rows],
    }


@router.get("/links/{link_id}")
async def network_link_detail(
    link_id: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT
                l.id,
                l.customer_registry_id,
                l.device_id,
                l.pppoe_username,
                l.ont_serial,
                l.olt_name,
                l.frame,
                l.slot,
                l.pon,
                l.ont_id,
                l.olt_rx_dbm,
                l.match_source,
                l.created_at,
                l.updated_at,

                c.customer_code,
                c.customer_name,
                c.contract_number,
                c.email,
                c.mobile,
                c.profile,
                c.address,
                c.civic_number,
                c.city,
                c.zip_code,
                c.province,

                d.acs_device_id,
                d.device_code,
                d.manufacturer,
                d.model,
                d.serial_number,
                d.software_version,
                d.hardware_version,
                d.online,
                d.wan_ip,
                d.last_seen,
                d.acs_last_inform
            FROM customer_network_links l
            LEFT JOIN customer_registry c
              ON c.id = l.customer_registry_id
            LEFT JOIN devices d
              ON d.id = l.device_id
            WHERE l.id = :link_id
        """),
        {"link_id": link_id},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Network link not found",
        )

    return {
        "success": True,
        "item": dict(row),
    }


@router.get("/customers/{customer_id}/link")
async def customer_network_link(
    customer_id: str,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT
                l.id,
                l.customer_registry_id,
                l.device_id,
                l.pppoe_username,
                l.ont_serial,
                l.olt_name,
                l.frame,
                l.slot,
                l.pon,
                l.ont_id,
                l.olt_rx_dbm,
                l.match_source,
                l.created_at,
                l.updated_at,

                d.acs_device_id,
                d.device_code,
                d.manufacturer,
                d.model,
                d.serial_number,
                d.software_version,
                d.online,
                d.wan_ip,
                d.last_seen
            FROM customer_network_links l
            LEFT JOIN devices d
              ON d.id = l.device_id
            WHERE l.customer_registry_id = :customer_id
            ORDER BY l.updated_at DESC NULLS LAST
            LIMIT 1
        """),
        {"customer_id": customer_id},
    ).mappings().first()

    if not row:
        return {
            "success": True,
            "found": False,
            "item": None,
        }

    return {
        "success": True,
        "found": True,
        "item": dict(row),
    }
