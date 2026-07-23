def get_value(obj, path, default=None):
    current = obj

    try:
        for key in path:
            current = current[key]

        if isinstance(current, dict) and "_value" in current:
            return current["_value"]

        return current

    except Exception:
        return default
