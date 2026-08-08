from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, Optional


CapabilityValue = bool | str | int | float | None


@dataclass(frozen=True)
class Capability:
    code: str
    supported: bool
    qualified: bool = True
    reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CapabilityProfile:
    code: str
    vendor: str
    model: str
    product_classes: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    data_models: tuple[str, ...] = ()
    capabilities: tuple[Capability, ...] = ()
    metadata: Dict[str, Any] = field(default_factory=dict)

    def matches(
        self,
        *,
        vendor: Optional[str],
        model: Optional[str],
        product_class: Optional[str],
    ) -> bool:
        normalized_vendor = normalize(vendor)
        normalized_model = normalize(model)
        normalized_product_class = normalize(product_class)

        if normalized_vendor and normalized_vendor != normalize(self.vendor):
            return False

        candidates = {
            normalize(self.model),
            *(normalize(value) for value in self.aliases),
            *(normalize(value) for value in self.product_classes),
        }
        observed = {normalized_model, normalized_product_class} - {""}
        return bool(candidates.intersection(observed))

    def capability_map(self) -> Dict[str, Dict[str, Any]]:
        return {item.code: item.to_dict() for item in self.capabilities}

    def supports(self, code: str) -> bool:
        item = next((cap for cap in self.capabilities if cap.code == code), None)
        return bool(item and item.supported)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "vendor": self.vendor,
            "model": self.model,
            "product_classes": list(self.product_classes),
            "aliases": list(self.aliases),
            "data_models": list(self.data_models),
            "capabilities": self.capability_map(),
            "metadata": self.metadata,
        }


def normalize(value: Optional[str]) -> str:
    return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum())


def capability(
    code: str,
    supported: bool,
    *,
    qualified: bool = True,
    reason: Optional[str] = None,
    **metadata: Any,
) -> Capability:
    return Capability(
        code=code,
        supported=supported,
        qualified=qualified,
        reason=reason,
        metadata=metadata,
    )


def flatten_codes(profiles: Iterable[CapabilityProfile]) -> list[str]:
    return sorted({cap.code for profile in profiles for cap in profile.capabilities})
