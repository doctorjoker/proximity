from __future__ import annotations

from .models import CPEProfile
from .registry import PROFILE_REGISTRY, normalize_profile_key


class CPEProfileNotFoundError(LookupError):
    """Raised when no CPE profile matches a vendor/product-class pair."""


def resolve_profile(
    vendor: str | None,
    product_class: str | None,
    *,
    required: bool = False,
) -> CPEProfile | None:
    """Resolve a profile by vendor and product class.

    Matching is case-insensitive and ignores spaces, hyphens and other
    non-alphanumeric characters. When ``required`` is false, an unknown
    profile returns ``None`` so callers can retain their current fallback.
    """

    profile = PROFILE_REGISTRY.get(
        (
            normalize_profile_key(vendor),
            normalize_profile_key(product_class),
        )
    )

    if profile is None and required:
        raise CPEProfileNotFoundError(
            "No CPE profile registered for "
            f"vendor={vendor!r}, product_class={product_class!r}"
        )

    return profile
