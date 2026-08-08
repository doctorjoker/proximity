import re
from typing import Any, Dict, Iterable, List, Optional, Tuple


def unwrap(value: Any) -> Any:
    if isinstance(value, dict) and "_value" in value:
        return value.get("_value")
    return value


def get_path(tree: Dict[str, Any], dotted: str) -> Any:
    current: Any = tree
    for part in dotted.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return unwrap(current)


def flatten_paths(value: Any, prefix: str = "") -> Iterable[Tuple[str, Any]]:
    if isinstance(value, dict):
        for key, child in value.items():
            if key.startswith("_"):
                continue
            path = f"{prefix}.{key}" if prefix else key
            yield path, child
            yield from flatten_paths(child, path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            path = f"{prefix}.{index}" if prefix else str(index)
            yield path, child
            yield from flatten_paths(child, path)


def first_value(tree: Dict[str, Any], candidates: List[str]) -> Optional[str]:
    for path in candidates:
        value = get_path(tree, path)
        if value not in (None, ""):
            return str(value)
    return None


def normalize_code(*parts: Optional[str]) -> str:
    text = "-".join(part for part in parts if part).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "generic-cpe"


def find_paths(paths: List[str], patterns: List[str], limit: int = 30) -> List[str]:
    lowered = [(path, path.lower()) for path in paths]
    result: List[str] = []
    for path, low in lowered:
        if any(pattern.lower() in low for pattern in patterns):
            result.append(path)
            if len(result) >= limit:
                break
    return result


def capability(paths: List[str], patterns: List[str], confidence: int, note: str) -> Dict[str, Any]:
    evidence = find_paths(paths, patterns)
    return {
        "supported": bool(evidence),
        "confidence": confidence if evidence else 0,
        "paths": evidence,
        "note": note if evidence else "Nessuna evidenza nello snapshot ACS corrente.",
    }


def analyze_device(device: Dict[str, Any], requested_code: Optional[str] = None) -> Dict[str, Any]:
    root = "Device" if isinstance(device.get("Device"), dict) else (
        "InternetGatewayDevice" if isinstance(device.get("InternetGatewayDevice"), dict) else None
    )
    root_tree = device.get(root, {}) if root else {}
    all_paths = sorted({path for path, _ in flatten_paths(device)})

    manufacturer = first_value(device, [
        "Device.DeviceInfo.Manufacturer",
        "InternetGatewayDevice.DeviceInfo.Manufacturer",
        "_deviceId._Manufacturer",
    ])
    model = first_value(device, [
        "Device.DeviceInfo.ModelName",
        "Device.DeviceInfo.ProductClass",
        "InternetGatewayDevice.DeviceInfo.ModelName",
        "InternetGatewayDevice.DeviceInfo.ProductClass",
        "_deviceId._ProductClass",
    ])
    product_class = first_value(device, [
        "Device.DeviceInfo.ProductClass",
        "InternetGatewayDevice.DeviceInfo.ProductClass",
        "_deviceId._ProductClass",
    ])
    serial = first_value(device, [
        "Device.DeviceInfo.SerialNumber",
        "InternetGatewayDevice.DeviceInfo.SerialNumber",
        "_deviceId._SerialNumber",
    ])
    oui = first_value(device, ["_deviceId._OUI"])
    hardware = first_value(device, [
        "Device.DeviceInfo.HardwareVersion",
        "InternetGatewayDevice.DeviceInfo.HardwareVersion",
    ])
    firmware = first_value(device, [
        "Device.DeviceInfo.SoftwareVersion",
        "InternetGatewayDevice.DeviceInfo.SoftwareVersion",
    ])
    summary = first_value(device, ["InternetGatewayDevice.DeviceSummary"])

    if root == "Device":
        data_model = "TR-181"
    elif root == "InternetGatewayDevice":
        data_model = "TR-098"
    else:
        data_model = "UNKNOWN"

    caps = {
        "wifi": capability(all_paths, [".wifi.", "wlanconfiguration"], 90, "Albero Wi-Fi rilevato."),
        "wifi_clients": capability(all_paths, ["associateddevice", "dataelements.network.device"], 85, "Tabelle client Wi-Fi rilevate; la presenza non garantisce che il firmware le popoli."),
        "hosts": capability(all_paths, [".hosts.host", "hostnumberofentries"], 85, "Tabella host LAN rilevata."),
        "pppoe": capability(all_paths, ["ppp.interface", "wanpppconnection"], 95, "Parametri PPP rilevati."),
        "wan": capability(all_paths, [".wan.", "wandevice", "ip.interface"], 90, "Parametri WAN rilevati."),
        "voip": capability(all_paths, ["voiceservice", "voiceprofile", "sip."], 85, "Parametri VoIP/SIP rilevati."),
        "tr143": capability(all_paths, ["downloadDiagnostics".lower(), "uploadDiagnostics".lower(), "ippingdiagnostics"], 90, "Oggetti diagnostici standard rilevati."),
        "firmware_upgrade": capability(all_paths, ["deviceinfo.softwareversion", "deviceinfo.provisioningcode"], 70, "Metadati firmware rilevati; il task Download va certificato separatamente."),
        "mesh": capability(all_paths, ["dataelements", "easy_mesh", "easymesh", "backhaul"], 75, "Evidenze mesh/DataElements rilevate."),
        "ethernet": capability(all_paths, ["ethernet.interface", "ethernetlan", "landevice"], 90, "Parametri Ethernet/LAN rilevati."),
    }

    mapping_patterns = {
        "manufacturer": ["deviceinfo.manufacturer"],
        "model": ["deviceinfo.modelname", "deviceinfo.productclass"],
        "serial_number": ["deviceinfo.serialnumber"],
        "firmware_version": ["deviceinfo.softwareversion"],
        "hardware_version": ["deviceinfo.hardwareversion"],
        "ppp_username": ["ppp.interface", "wanpppconnection"],
        "wan_ip": ["externalipaddress", "localipaddress", "ip.interface"],
        "wifi_ssid": [".ssid", "wlanconfiguration"],
        "wifi_clients": ["associateddevice"],
        "lan_hosts": [".hosts.host"],
        "diagnostics": ["diagnosticsstate", "ippingdiagnostics", "downloaddiagnostics"],
    }
    mapping = {key: find_paths(all_paths, patterns, limit=12) for key, patterns in mapping_patterns.items()}

    vendor_extensions = sorted({
        path for path in all_paths
        if any(part.startswith("X_") or part.startswith("X-") for part in path.split("."))
    })[:500]

    warnings: List[str] = []
    if not root:
        warnings.append("Root object CWMP non riconosciuto.")
    if caps["wifi"]["supported"] and not caps["wifi_clients"]["supported"]:
        warnings.append("Wi-Fi rilevato, ma nessuna tabella client individuata nello snapshot.")
    if caps["wifi_clients"]["supported"]:
        warnings.append("La capability Wi-Fi clients deve essere validata con almeno un client realmente connesso.")

    profile_code = requested_code or normalize_code(manufacturer, model or product_class, data_model)
    return {
        "profile_code": profile_code,
        "manufacturer": manufacturer,
        "model": model,
        "product_class": product_class,
        "serial_number": serial,
        "oui": oui,
        "hardware_version": hardware,
        "firmware_version": firmware,
        "root_object": root,
        "data_model": data_model,
        "device_summary": summary,
        "capabilities": caps,
        "parameter_mapping": mapping,
        "vendor_extensions": vendor_extensions,
        "supported_paths_count": len(all_paths),
        "qualification_status": "DRAFT",
        "warnings": warnings,
        "raw_metadata": {
            "last_inform": unwrap(device.get("_lastInform")),
            "registered": unwrap(device.get("_registered")),
            "root_keys": sorted(root_tree.keys()) if isinstance(root_tree, dict) else [],
        },
    }
