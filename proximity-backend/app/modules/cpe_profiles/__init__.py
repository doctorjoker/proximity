"""CPE profile engine foundation.

This package contains vendor/model specific TR-069 parameter mappings and
resolver helpers. It is intentionally isolated from runtime routers in
EUREKA31.4.0 to avoid behavioural regressions.
"""

from .models import CPEProfile, WiFiBandProfile
from .resolver import resolve_profile

__all__ = ["CPEProfile", "WiFiBandProfile", "resolve_profile"]
