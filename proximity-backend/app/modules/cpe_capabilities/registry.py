from __future__ import annotations

from .models import CapabilityProfile, capability


XC220_G3V = CapabilityProfile(
    code="tplink_xc220_g3v",
    vendor="TP-Link",
    model="XC220-G3v",
    product_classes=("XC220-G3v",),
    aliases=("XC220G3v",),
    data_models=("TR-098",),
    capabilities=(
        capability("acs.identity", True),
        capability("acs.tr098", True),
        capability("acs.tr181", False, reason="Profilo qualificato su data model TR-098"),
        capability("wifi.configuration", True),
        capability("wifi.radio.toggle", True),
        capability("wifi.channel.change", True),
        capability("wifi.bandwidth.change", True),
        capability("wifi.scan.execute", True),
        capability(
            "wifi.scan.results_exported",
            False,
            reason="La scansione termina in Completed, ma il firmware non esporta righe BSS via ACS",
            trigger_value="Requested",
            terminal_state="Completed",
        ),
        capability(
            "wifi.channel.advisor",
            False,
            reason="Richiede risultati delle reti vicine esportati dal CPE",
        ),
        capability("diagnostics.foundation_probe", True),
        capability("diagnostics.wifi_scan", True),
        capability("diagnostics.ping", False, qualified=False, reason="Handler non ancora qualificato"),
        capability("diagnostics.traceroute", False, qualified=False, reason="Handler non ancora qualificato"),
        capability("diagnostics.dns", False, qualified=False, reason="Handler non ancora qualificato"),
        capability("diagnostics.tr143.download", False, qualified=False, reason="Da qualificare sul dispositivo reale"),
        capability("diagnostics.tr143.upload", False, qualified=False, reason="Da qualificare sul dispositivo reale"),
        capability("firmware.upgrade", True, reason="Percorso download task già validato nel prodotto"),
        capability("procedures.automation", True),
    ),
    metadata={
        "qualification_status": "QUALIFIED",
        "qualification_checkpoint": "EUREKA34.0.0",
    },
)


PROFILES: tuple[CapabilityProfile, ...] = (
    XC220_G3V,
)


def get_profiles() -> tuple[CapabilityProfile, ...]:
    return PROFILES
