from app.device_profiles.generic_tr181 import GENERIC_TR181_PROFILE

from app.device_profiles.generic_tr181 import GENERIC_TR181_PROFILE
from app.device_profiles.tplink_xc220_g3v import TPLINK_XC220_G3V_PROFILE

def get_param(payload: dict, path: str):
    current = payload

    for part in path.split("."):
        if not part:
            continue

        if not isinstance(current, dict):
            return None

        current = current.get(part)

        if current is None:
            return None

    if isinstance(current, dict) and "_value" in current:
        return current.get("_value")

    return current


def unwrap(value):
    if isinstance(value, dict):
        return value.get("_value")
    return value


def first_value(payload: dict, paths: list[str]):
    for path in paths or []:
        value = unwrap(get_param(payload, path))

        if value is not None and value != "":
            return {
                "path": path,
                "value": value,
            }

    return {
        "path": None,
        "value": None,
    }


def resolve_device_profile(device):
    model = str(getattr(device, "model", "") or "").strip().upper()
    product_class = str(getattr(device, "product_class", "") or "").strip().upper()
    manufacturer = str(getattr(device, "manufacturer", "") or "").strip().upper()

    if (
        manufacturer == "TP-LINK"
        and (
            model == "XC220-G3V"
            or product_class == "XC220-G3V"
        )
    ):
        return TPLINK_XC220_G3V_PROFILE

    return GENERIC_TR181_PROFILE


def read_capability(device, payload: dict, key: str):
    profile = resolve_device_profile(device)
    paths = profile.get("paths", {}).get(key, [])

    found = first_value(payload, paths)

    return {
        "profile_code": profile.get("profile_code"),
        "capability": key,
        "path": found.get("path"),
        "value": found.get("value"),
        "supported": found.get("path") is not None,
    }
