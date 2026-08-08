from __future__ import annotations

from .models import CPEProfile
from .profiles.tplink_xc220_g3v import PROFILE as TPLINK_XC220_G3V_PROFILE


def normalize_profile_key(value: str | None) -> str:
    """Normalize vendor/product identifiers for deterministic lookup."""

    return "".join(character.lower() for character in (value or "") if character.isalnum())


PROFILE_REGISTRY: dict[tuple[str, str], CPEProfile] = {
    (
        normalize_profile_key(TPLINK_XC220_G3V_PROFILE.vendor),
        normalize_profile_key(TPLINK_XC220_G3V_PROFILE.product_class),
    ): TPLINK_XC220_G3V_PROFILE,
}
