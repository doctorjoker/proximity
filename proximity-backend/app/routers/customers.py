import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


router = APIRouter(
    prefix="/api/v1/customers",
    tags=["customers"],
)


def clean(value: Any) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    return value


def first_value(row: dict, names: list[str]) -> str | None:
    for name in names:
        if name in row:
            value = clean(row.get(name))
            if value:
                return value
    return None


def normalize_radius_login(value: str | None) -> str | None:
    value = clean(value)
    if not value:
        return None
    return value.lower()


@router.get("/health")
async def customers_health():
    return {
        "success": True,
        "module": "customers",
    }


@router.get("")
async def list_customers(
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)

    where = ""
    params = {
        "limit": limit,
        "offset": offset,
        "q": f"%{q.lower()}%" if q else None,
    }

    if q:
        where = """
            WHERE
                LOWER(COALESCE(customer_name, '')) LIKE :q
                OR LOWER(COALESCE(customer_code, '')) LIKE :q
                OR LOWER(COALESCE(contract_number, '')) LIKE :q
                OR LOWER(COALESCE(radius_login, '')) LIKE :q
                OR LOWER(COALESCE(city, '')) LIKE :q
        """

    rows = db.execute(
        text(f"""
            SELECT
                c.id,
                c.customer_code,
                c.contract_number,
                c.customer_name,
                c.email,
                c.mobile,
                c.profile,
                c.radius_login,
                c.address,
                c.civic_number,
                c.city,
                c.zip_code,
                c.province,
                c.created_at,
                c.updated_at,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'device_code', d.device_code,
                            'acs_device_id', d.acs_device_id,
                            'manufacturer', d.manufacturer,
                            'model', d.model,
                            'serial_number', d.serial_number,
                            'software_version', d.software_version,
                            'online', d.online,
                            'last_seen', d.last_seen,
                            'pppoe_username', d.pppoe_username,
                            'wan_ip', d.wan_ip,
                            'customer_registry_id', d.customer_registry_id
                        )
                    ) FILTER (WHERE d.id IS NOT NULL),
                    '[]'::jsonb
                ) AS devices
            FROM customer_registry c
            LEFT JOIN devices d
              ON d.customer_registry_id = c.id
              OR LOWER(COALESCE(d.pppoe_username, '')) = LOWER(COALESCE(c.radius_login, ''))
            {where.replace('customer_name', 'c.customer_name').replace('customer_code', 'c.customer_code').replace('contract_number', 'c.contract_number').replace('radius_login', 'c.radius_login').replace('city', 'c.city')}
            GROUP BY
                c.id,
                c.customer_code,
                c.contract_number,
                c.customer_name,
                c.email,
                c.mobile,
                c.profile,
                c.radius_login,
                c.address,
                c.civic_number,
                c.city,
                c.zip_code,
                c.province,
                c.created_at,
                c.updated_at
            ORDER BY c.customer_name
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()

    count_where = where.replace("customer_name", "c.customer_name").replace("customer_code", "c.customer_code").replace("contract_number", "c.contract_number").replace("radius_login", "c.radius_login").replace("city", "c.city")

    count = db.execute(
        text(f"""
            SELECT COUNT(*)
            FROM customer_registry c
            {count_where}
        """),
        params,
    ).scalar()

    return {
        "success": True,
        "count": count,
        "limit": limit,
        "offset": offset,
        "items": [dict(row) for row in rows],
    }


@router.get("/{customer_id}")
async def customer_detail(
    customer_id: str,
    db: Session = Depends(get_db),
):
    customer = db.execute(
        text("""
            SELECT
                id,
                customer_code,
                contract_number,
                customer_name,
                email,
                mobile,
                profile,
                radius_login,
                address,
                civic_number,
                city,
                zip_code,
                province,
                created_at,
                updated_at
            FROM customer_registry
            WHERE id = :customer_id
        """),
        {"customer_id": customer_id},
    ).mappings().first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Foundation: device link will become precise once ACS PPPoE extraction is stored.
    # For now this tries common future columns and safely returns [] if they do not exist.
    devices = []
    try:
        devices = db.execute(
            text("""
                SELECT
                    id,
                    device_code,
                    acs_device_id,
                    manufacturer,
                    model,
                    serial_number,
                    software_version,
                    online,
                    last_seen,
                    pppoe_username,
                    wan_ip,
                    customer_registry_id
                FROM devices
                WHERE customer_registry_id = :customer_id
                   OR LOWER(COALESCE(pppoe_username, '')) = LOWER(:radius_login)
                ORDER BY last_seen DESC NULLS LAST
            """),
            {
                "customer_id": customer["id"],
                "radius_login": customer["radius_login"] or "",
            },
        ).mappings().all()
    except Exception:
        db.rollback()
        devices = []

    return {
        "success": True,
        "customer": dict(customer),
        "devices": [dict(device) for device in devices],
    }


@router.post("/import-webilly")
async def import_webilly_customers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    raw = await file.read()

    text_content = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text_content = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text_content is None:
        raise HTTPException(status_code=400, detail="Unable to decode CSV file")

    # Webilly exports can be comma or semicolon separated.
    sample = text_content[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
    except Exception:
        dialect = csv.excel
        dialect.delimiter = ";"

    reader = csv.DictReader(io.StringIO(text_content), dialect=dialect)

    imported = 0
    updated = 0
    skipped = 0
    errors = []

    for line_number, row in enumerate(reader, start=2):
        try:
            customer_name = first_value(row, [
                "DENOMINAZIONE CLIENTE",
                "CLIENTE",
                "NOME CLIENTE",
                "RAGIONE SOCIALE",
                "customer_name",
            ])

            radius_login = normalize_radius_login(first_value(row, [
                "LOGIN RADIUS",
                "RADIUS LOGIN",
                "PPPOE",
                "PPPOE USERNAME",
                "USERNAME PPPoE",
                "radius_login",
            ]))

            if not customer_name:
                skipped += 1
                continue

            customer_code = first_value(row, [
                "CODICE CLIENTE",
                "CODICE",
                "customer_code",
            ])

            contract_number = first_value(row, [
                "NUMERO",
                "NUMERO CONTRATTO",
                "CONTRATTO",
                "contract_number",
            ])

            payload = {
                "customer_code": customer_code,
                "contract_number": contract_number,
                "customer_name": customer_name,
                "email": first_value(row, ["EMAIL CLIENTE", "EMAIL", "email"]),
                "mobile": first_value(row, ["CELLULARE CLIENTE", "CELLULARE", "TELEFONO", "mobile"]),
                "profile": first_value(row, ["PROFILO", "PROFILE", "profile"]),
                "radius_login": radius_login,
                "address": first_value(row, ["INDIRIZZO", "address"]),
                "civic_number": first_value(row, ["NUMERO CIVICO", "CIVICO", "civic_number"]),
                "city": first_value(row, ["COMUNE", "CITTA", "CITTÀ", "city"]),
                "zip_code": first_value(row, ["CAP", "zip_code"]),
                "province": first_value(row, ["PROVINCIA", "province"]),
            }

            if radius_login:
                existing = db.execute(
                    text("""
                        SELECT id
                        FROM customer_registry
                        WHERE radius_login = :radius_login
                    """),
                    {"radius_login": radius_login},
                ).first()

                db.execute(
                    text("""
                        INSERT INTO customer_registry (
                            customer_code,
                            contract_number,
                            customer_name,
                            email,
                            mobile,
                            profile,
                            radius_login,
                            address,
                            civic_number,
                            city,
                            zip_code,
                            province,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :customer_code,
                            :contract_number,
                            :customer_name,
                            :email,
                            :mobile,
                            :profile,
                            :radius_login,
                            :address,
                            :civic_number,
                            :city,
                            :zip_code,
                            :province,
                            NOW(),
                            NOW()
                        )
                        ON CONFLICT (radius_login)
                        DO UPDATE SET
                            customer_code = EXCLUDED.customer_code,
                            contract_number = EXCLUDED.contract_number,
                            customer_name = EXCLUDED.customer_name,
                            email = EXCLUDED.email,
                            mobile = EXCLUDED.mobile,
                            profile = EXCLUDED.profile,
                            address = EXCLUDED.address,
                            civic_number = EXCLUDED.civic_number,
                            city = EXCLUDED.city,
                            zip_code = EXCLUDED.zip_code,
                            province = EXCLUDED.province,
                            updated_at = NOW()
                    """),
                    payload,
                )

                if existing:
                    updated += 1
                else:
                    imported += 1
            else:
                # Keep customers without radius_login, but avoid ON CONFLICT on NULL.
                db.execute(
                    text("""
                        INSERT INTO customer_registry (
                            customer_code,
                            contract_number,
                            customer_name,
                            email,
                            mobile,
                            profile,
                            radius_login,
                            address,
                            civic_number,
                            city,
                            zip_code,
                            province,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :customer_code,
                            :contract_number,
                            :customer_name,
                            :email,
                            :mobile,
                            :profile,
                            NULL,
                            :address,
                            :civic_number,
                            :city,
                            :zip_code,
                            :province,
                            NOW(),
                            NOW()
                        )
                    """),
                    payload,
                )
                imported += 1

        except Exception as exc:
            db.rollback()
            skipped += 1
            errors.append({
                "line": line_number,
                "error": str(exc),
            })
            if len(errors) >= 10:
                break

    db.commit()

    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
