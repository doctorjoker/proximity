from __future__ import annotations

from typing import Any


XC220_G3V_DIGITAL_TWIN: dict[str, Any] = {
    "hardware": {
        "architecture": "AC1200 dual-band GPON residential gateway",
        "product_class": "XC220-G3v",
        "ethernet_ports": "4 x 10/100/1000 Mbps RJ45 LAN",
        "gpon_port": "1 x SC/APC GPON",
        "voice_ports": "1 x RJ11 FXS",
        "usb_ports": "Not present in the qualified model specification",
        "antennas": "2 external dual-band antennas",
        "power_supply": "12 V / 1.5 A",
        "wifi_class": "AC1200 (300 Mbps 2.4 GHz + 867 Mbps 5 GHz)",
        "management_models": "OMCI, TR-069, TR-369, TR-098, TR-181, TR-111, TR-104, TR-143",
        "features": {
            "gpon": "SUPPORTED",
            "dual_band_wifi": "SUPPORTED",
            "gigabit_lan": "SUPPORTED",
            "voip_fxs": "SUPPORTED",
            "easymesh": "SUPPORTED",
            "ipv4": "SUPPORTED",
            "ipv6": "SUPPORTED",
            "nat": "SUPPORTED",
            "firewall": "SUPPORTED",
            "qos": "SUPPORTED",
            "wps": "SUPPORTED",
            "tr069": "SUPPORTED",
            "tr143": "DISCOVERED",
        },
        "qualification": {
            "source": "TP-Link XC220-G3v official product specification and Proximity live-device qualification",
            "model_variant": "XC220-G3v v2.0",
            "release": "EUREKA36.2.0",
        },
    },
    "firmware": {
        "qualified_versions": [
            "1.8.0 0.8.0 v6062.0 Build 230720 Rel.48094n",
        ],
        "recommended_version": "1.8.0 0.8.0 v6062.0 Build 230720 Rel.48094n",
        "upgrade": {
            "support": "SUPPORTED",
            "execution": "GENIEACS_DOWNLOAD_TASK",
            "rollback": "NOT_QUALIFIED",
        },
        "known_issues": [
            "Neighbour WiFi scan completes but does not export X_TP_BSSDescEntry rows through ACS.",
            "CPU and memory telemetry are not exposed by the qualified firmware.",
        ],
    },
    "wifi": {
        "2.4GHz": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "standards": "IEEE 802.11b/g/n",
            "signal_rate": "Up to 300 Mbps",
            "channel_width": "20/40 MHz",
            "configuration": "PROFILE_DRIVEN",
        },
        "5GHz": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "standards": "IEEE 802.11a/n/ac",
            "signal_rate": "Up to 867 Mbps",
            "channel_width": "20/40/80 MHz",
            "dfs": "NOT_SUPPORTED_BY_MODEL_SPEC",
            "configuration": "PROFILE_DRIVEN",
        },
        "EASYMESH": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "WPS": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "WPA_WPA2": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "WIFI_SCAN": {
            "support": "LIMITED",
            "qualification": "QUALIFIED",
            "reason": "Execution is qualified; neighbouring BSS rows are not exported through ACS.",
        },
    },
    "wan": {
        "GPON": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
            "standards": "ITU-T G.984 / G.988",
        },
        "PPPOE": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "telemetry": "AVAILABLE",
        },
        "DHCP_CLIENT": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "STATIC_IP": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "VLAN_802_1Q": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
        },
        "IPV6": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "NAT": {
            "support": "SUPPORTED",
            "qualification": "MODEL_SPECIFICATION",
        },
        "BRIDGE": {
            "support": "DISCOVERED",
            "qualification": "NOT_QUALIFIED",
        },
    },
    "voice": {
        "FXS": {
            "support": "SUPPORTED",
            "ports": 1,
            "qualification": "MODEL_SPECIFICATION",
        },
        "SIP_RUNTIME": {
            "support": "NOT_QUALIFIED",
            "qualification": "NOT_QUALIFIED",
            "reason": "VoIP runtime and provisioning paths have not yet been qualified on the lab device.",
        },
    },
    "remote_actions": {
        "REFRESH_RUNTIME": {
            "support": "SUPPORTED",
            "execution": "GENIEACS_REFRESH_OBJECTS",
            "qualification": "QUALIFIED",
        },
        "REBOOT": {
            "support": "SUPPORTED",
            "execution": "GENIEACS_REBOOT_TASK",
            "qualification": "DISCOVERED",
        },
        "FACTORY_RESET": {
            "support": "NOT_QUALIFIED",
            "execution": None,
            "qualification": "NOT_QUALIFIED",
            "reason": "Destructive action requires an explicit real-device qualification procedure.",
        },
        "WIFI_SCAN": {
            "support": "SUPPORTED",
            "execution": "DEVICE_DIAGNOSTICS_ENGINE",
            "qualification": "QUALIFIED",
        },
        "FIRMWARE_UPGRADE": {
            "support": "SUPPORTED",
            "execution": "GENIEACS_DOWNLOAD_TASK",
            "qualification": "QUALIFIED",
        },
    },
    "procedures": {
        "PROVISION_PPPOE": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "workflow_code": "provision_pppoe",
        },
        "RESET_WIFI": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "workflow_code": "reset_wifi",
        },
        "OPTIMIZE_WIFI": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "workflow_code": "optimize_wifi",
        },
        "UPGRADE_FIRMWARE": {
            "support": "SUPPORTED",
            "qualification": "QUALIFIED",
            "workflow_code": "upgrade_firmware",
        },
        "REPLACE_ROUTER": {
            "support": "SUPPORTED",
            "qualification": "PLATFORM",
            "workflow_code": "router_replacement",
        },
    },
    "events": {
        "0 BOOTSTRAP": {"label": "Prima registrazione ACS", "severity": "INFO"},
        "1 BOOT": {"label": "Riavvio dispositivo", "severity": "INFO"},
        "2 PERIODIC": {"label": "Inform periodico", "severity": "DEBUG"},
        "4 VALUE CHANGE": {"label": "Variazione parametro", "severity": "INFO"},
        "6 CONNECTION REQUEST": {"label": "Richiesta connessione ACS", "severity": "INFO"},
        "7 TRANSFER COMPLETE": {"label": "Trasferimento completato", "severity": "INFO"},
        "M Download": {"label": "Download avviato", "severity": "INFO"},
        "M Upload": {"label": "Upload avviato", "severity": "INFO"},
    },
    "inventory": {
        "WAN": {"support": "SUPPORTED", "source": "TR-098 WANDevice"},
        "LAN": {"support": "SUPPORTED", "source": "4 x Gigabit LAN"},
        "GPON": {"support": "SUPPORTED", "source": "SC/APC GPON interface"},
        "WIFI_RADIOS": {"support": "SUPPORTED", "source": "2.4 GHz and 5 GHz radios"},
        "WIFI_SSIDS": {"support": "SUPPORTED", "source": "WLANConfiguration"},
        "CLIENTS": {"support": "LIMITED", "source": "AssociatedDevice and host inventory"},
        "VOICE_FXS": {"support": "SUPPORTED", "source": "1 x RJ11 FXS"},
        "USB": {"support": "UNSUPPORTED", "source": "Model specification"},
        "BUTTONS": {"support": "SUPPORTED", "source": "WPS/Wi-Fi and RESET"},
        "ANTENNAS": {"support": "SUPPORTED", "source": "2 external dual-band antennas"},
    },
}


DIGITAL_TWIN_CATALOG: dict[tuple[str, str], dict[str, Any]] = {
    ("tp-link", "xc220-g3v"): XC220_G3V_DIGITAL_TWIN,
}


def resolve_digital_twin_extension(vendor: str | None, product_class: str | None) -> dict[str, Any]:
    key = ((vendor or "").strip().lower(), (product_class or "").strip().lower())
    return DIGITAL_TWIN_CATALOG.get(key, {})
