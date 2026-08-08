from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Iterable


class QualificationLevel(str, Enum):
    DISCOVERED = "DISCOVERED"
    TESTED = "TESTED"
    QUALIFIED = "QUALIFIED"
    LIMITED = "LIMITED"
    BROKEN = "BROKEN"
    DEPRECATED = "DEPRECATED"


@dataclass(frozen=True)
class QualificationEvidence:
    code: str
    title: str
    observed_at: str
    result: str
    source: str
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CapabilityQualification:
    capability_code: str
    level: QualificationLevel
    method: str
    validated_firmware: tuple[str, ...] = ()
    limitations: tuple[str, ...] = ()
    evidence: tuple[QualificationEvidence, ...] = ()
    last_verified_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["level"] = self.level.value
        payload["evidence"] = [item.to_dict() for item in self.evidence]
        return payload


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def qualification_score(items: Iterable[CapabilityQualification]) -> dict[str, Any]:
    rows = list(items)
    if not rows:
        return {"score": 0, "qualified": 0, "total": 0}

    weights = {
        QualificationLevel.DISCOVERED: 25,
        QualificationLevel.TESTED: 60,
        QualificationLevel.QUALIFIED: 100,
        QualificationLevel.LIMITED: 75,
        QualificationLevel.BROKEN: 0,
        QualificationLevel.DEPRECATED: 0,
    }
    total = len(rows)
    score = round(sum(weights[item.level] for item in rows) / total)
    qualified = sum(
        1
        for item in rows
        if item.level in {QualificationLevel.QUALIFIED, QualificationLevel.LIMITED}
    )
    return {"score": score, "qualified": qualified, "total": total}


XC220_QUALIFICATIONS: dict[str, CapabilityQualification] = {
    "wifi.configuration": CapabilityQualification(
        capability_code="wifi.configuration",
        level=QualificationLevel.QUALIFIED,
        method="TR-098 vendor profile",
        validated_firmware=("1.8.0 0.8.0 v6062.0 Build 230720 Rel.48094n",),
        evidence=(
            QualificationEvidence(
                code="EUREKA31.5.5-WIFI-CONFIG",
                title="Device360 WiFi configuration validated",
                observed_at="2026-07-31T00:00:00+00:00",
                result="SSID, password, radio, channel and bandwidth paths validated on real CPE",
                source="Device360 operational qualification",
            ),
        ),
        last_verified_at="2026-07-31T00:00:00+00:00",
    ),
    "wifi.scan.execute": CapabilityQualification(
        capability_code="wifi.scan.execute",
        level=QualificationLevel.QUALIFIED,
        method="TR-098 TP-Link proprietary trigger",
        validated_firmware=("1.8.0 0.8.0 v6062.0 Build 230720 Rel.48094n",),
        evidence=(
            QualificationEvidence(
                code="EUREKA32.1.3-WIFI-SCAN-TRIGGER",
                title="Neighbour scan trigger completed",
                observed_at="2026-07-31T21:12:53.084000+00:00",
                result="Both 2.4 GHz and 5 GHz transitioned from Requested to Completed",
                source="GenieACS live-device validation",
                details={
                    "trigger_value": "Requested",
                    "terminal_state": "Completed",
                },
            ),
        ),
        last_verified_at="2026-07-31T21:12:53.084000+00:00",
    ),
    "wifi.scan.results_exported": CapabilityQualification(
        capability_code="wifi.scan.results_exported",
        level=QualificationLevel.LIMITED,
        method="TR-098 TP-Link proprietary result object",
        validated_firmware=("1.8.0 0.8.0 v6062.0 Build 230720 Rel.48094n",),
        limitations=(
            "The CPE completes the scan but exposes no X_TP_BSSDescEntry rows through ACS",
        ),
        evidence=(
            QualificationEvidence(
                code="EUREKA32.1.3-WIFI-SCAN-RESULTS",
                title="Neighbour result export limitation confirmed",
                observed_at="2026-07-31T21:18:03.692000+00:00",
                result="No new result instances or scalar values appeared after Completed and targeted refresh",
                source="Full ACS payload before/after diff",
                details={
                    "result_count_24": 0,
                    "result_count_5": 0,
                    "results_path_24": "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_TP_BSSDescEntry",
                    "results_path_5": "InternetGatewayDevice.LANDevice.1.WLANConfiguration.3.X_TP_BSSDescEntry",
                },
            ),
        ),
        last_verified_at="2026-07-31T21:18:03.692000+00:00",
    ),
    "diagnostics.tr143.download": CapabilityQualification(
        capability_code="diagnostics.tr143.download",
        level=QualificationLevel.DISCOVERED,
        method="TR-143",
        limitations=("Real-device execution still requires qualification",),
    ),
    "diagnostics.tr143.upload": CapabilityQualification(
        capability_code="diagnostics.tr143.upload",
        level=QualificationLevel.DISCOVERED,
        method="TR-143",
        limitations=("Real-device execution still requires qualification",),
    ),
}
