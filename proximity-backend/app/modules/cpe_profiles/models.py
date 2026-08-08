from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class WiFiBandProfile:
    """TR-069 paths used to manage one WiFi band."""

    ssid: str | None = None
    password: str | None = None
    enable: str | None = None
    channel: str | None = None
    auto_channel: str | None = None
    bandwidth: str | None = None
    radio_enabled: str | None = None
    ssid_advertisement_enabled: str | None = None
    transmit_power: str | None = None
    wps_enable: str | None = None
    beacon_type: str | None = None
    wpa_authentication_mode: str | None = None
    ieee11i_authentication_mode: str | None = None
    wpa_encryption_modes: str | None = None
    ieee11i_encryption_modes: str | None = None
    standard: str | None = None
    max_bit_rate: str | None = None
    neighbor_scan_trigger: str | None = None
    neighbor_scan_trigger_value: str | None = None
    neighbor_scan_results: str | None = None


@dataclass(frozen=True, slots=True)
class TelemetryMetricProfile:
    """One normalized telemetry metric exposed by a device driver."""

    code: str
    paths: tuple[str, ...] = ()
    value_type: str = "string"
    unit: str | None = None
    support: str = "SUPPORTED"
    reason: str | None = None
    description: str | None = None
    stale_after_seconds: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DeviceIdentityProfile:
    """Static identity and presentation metadata for a qualified model."""

    model: str
    family: str | None = None
    category: str | None = None
    description: str | None = None
    image: str | None = None
    vendor_logo: str | None = None


@dataclass(frozen=True, slots=True)
class DeviceCapabilityProfile:
    """Declared model capability with an operational support state."""

    code: str
    support: str
    reason: str | None = None
    qualification: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DiagnosticCapabilityProfile:
    """Model-specific diagnostic contract consumed by Device360."""

    code: str
    support: str
    qualification: str
    execution: str | None = None
    aliases: tuple[str, ...] = ()
    reason: str | None = None
    timeout_seconds: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class CPEProfile:
    """Vendor/model specific Device Driver."""

    vendor: str
    product_class: str
    data_model: str
    refresh_root: str
    wifi24: WiFiBandProfile
    wifi5: WiFiBandProfile
    identity: DeviceIdentityProfile | None = None
    telemetry: tuple[TelemetryMetricProfile, ...] = ()
    capabilities: tuple[DeviceCapabilityProfile, ...] = ()
    diagnostics: tuple[DiagnosticCapabilityProfile, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)
