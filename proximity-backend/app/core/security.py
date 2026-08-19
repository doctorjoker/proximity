from functools import lru_cache
from typing import Any

import httpx
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import settings


@lru_cache(maxsize=1)
def _openid_configuration() -> dict[str, Any]:
    try:
        response = httpx.get(
            settings.oidc_discovery_url,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise RuntimeError(
            f"Unable to load OIDC configuration: {exc}"
        ) from exc


@lru_cache(maxsize=1)
def _jwks() -> dict[str, Any]:
    config = _openid_configuration()

    try:
        response = httpx.get(
            config["jwks_uri"],
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise RuntimeError(
            f"Unable to load OIDC JWKS: {exc}"
        ) from exc


def _unauthorized(detail: str = "Invalid or missing access token"):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        if not kid:
            _unauthorized("Access token has no key id")

        jwks = _jwks()

        key = next(
            (
                item
                for item in jwks.get("keys", [])
                if item.get("kid") == kid
            ),
            None,
        )

        if key is None:
            # Keycloak may have rotated its signing key.
            _jwks.cache_clear()
            jwks = _jwks()

            key = next(
                (
                    item
                    for item in jwks.get("keys", [])
                    if item.get("kid") == kid
                ),
                None,
            )

        if key is None:
            _unauthorized("Unknown token signing key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.oidc_issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True,
                # Keycloak SPA access tokens do not always use the
                # client_id as aud. Client validation is performed
                # explicitly below through azp/aud.
                "verify_aud": False,
            },
        )

        azp = payload.get("azp")
        aud = payload.get("aud", [])

        if isinstance(aud, str):
            aud = [aud]

        if (
            settings.oidc_client_id
            and azp != settings.oidc_client_id
            and settings.oidc_client_id not in aud
        ):
            _unauthorized("Token was not issued for Proximity")

        return payload

    except HTTPException:
        raise
    except JWTError:
        _unauthorized()
    except Exception:
        _unauthorized()


def authenticate_request(request: Request) -> dict[str, Any]:
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        _unauthorized("Bearer token required")

    token = authorization[7:].strip()

    if not token:
        _unauthorized("Bearer token required")

    return decode_access_token(token)


def identity_from_claims(claims: dict[str, Any]) -> dict[str, Any]:
    realm_access = claims.get("realm_access") or {}
    roles = realm_access.get("roles") or []

    return {
        "sub": claims.get("sub"),
        "username": claims.get("preferred_username"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "given_name": claims.get("given_name"),
        "family_name": claims.get("family_name"),
        "roles": roles,
    }
