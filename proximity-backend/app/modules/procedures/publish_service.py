from .publish_repository import (
    clone_version,
    get_version,
    list_version_phases,
    list_version_variables,
    publish_version,
)


REQUIRED_PHASE_FIELDS = (
    "name",
    "action",
    "type",
    "timeout",
    "status",
)


def _issue(level: str, code: str, message: str, entity=None):
    return {
        "level": level,
        "code": code,
        "message": message,
        "entity": entity,
    }


def service_validate_version(code: str, version: str, payload=None):
    version_item = get_version(code, version)
    if not version_item:
        return None

    phases = list_version_phases(version_item["id"])
    variables = list_version_variables(version_item["id"])

    issues = []
    warnings = []

    if not phases:
        issues.append(
            _issue(
                "error",
                "NO_PHASES",
                "La versione non contiene nessuna fase.",
                "phases",
            )
        )

    seen_orders = set()
    seen_variables = set()

    for phase in phases:
        order = phase.get("phase_order")
        if order in seen_orders:
            issues.append(
                _issue(
                    "error",
                    "DUPLICATE_PHASE_ORDER",
                    f"Ordine fase duplicato: {order}.",
                    f"phase:{phase.get('id')}",
                )
            )
        seen_orders.add(order)

        for field in REQUIRED_PHASE_FIELDS:
            if phase.get(field) in (None, ""):
                issues.append(
                    _issue(
                        "error",
                        "MISSING_PHASE_FIELD",
                        f"Campo fase mancante: {field}.",
                        f"phase:{phase.get('id')}",
                    )
                )

        if phase.get("retry") is None:
            warnings.append(
                _issue(
                    "warning",
                    "MISSING_RETRY",
                    "Retry non impostato, verrà considerato 0.",
                    f"phase:{phase.get('id')}",
                )
            )

    for variable in variables:
        key = (variable.get("scope"), variable.get("name"))
        if key in seen_variables:
            issues.append(
                _issue(
                    "error",
                    "DUPLICATE_VARIABLE",
                    f"Variabile duplicata: {variable.get('scope')} / {variable.get('name')}.",
                    f"variable:{variable.get('id')}",
                )
            )
        seen_variables.add(key)

        if not variable.get("name"):
            issues.append(
                _issue(
                    "error",
                    "MISSING_VARIABLE_NAME",
                    "Nome variabile mancante.",
                    f"variable:{variable.get('id')}",
                )
            )

        if not variable.get("scope"):
            issues.append(
                _issue(
                    "error",
                    "MISSING_VARIABLE_SCOPE",
                    "Scope variabile mancante.",
                    f"variable:{variable.get('id')}",
                )
            )

    valid = len(issues) == 0

    return {
        "valid": valid,
        "procedure_code": code,
        "version": version,
        "phase_count": len(phases),
        "variable_count": len(variables),
        "issues": issues,
        "warnings": warnings,
    }


def service_publish_version(code: str, version: str, payload):
    validation = service_validate_version(code, version, payload)
    if validation is None:
        return None

    if not validation["valid"] and not getattr(payload, "force", False):
        return {
            "published": False,
            "validation": validation,
            "message": "La versione non supera la validazione.",
        }

    published = publish_version(
        code,
        version,
        getattr(payload, "requested_by", None) or "Admin Proximity",
    )

    return {
        "published": True,
        "validation": validation,
        **published,
    }


def service_clone_version(code: str, version: str, payload):
    cloned = clone_version(
        code,
        version,
        getattr(payload, "requested_by", None) or "Admin Proximity",
        getattr(payload, "target_version", None),
        getattr(payload, "notes", None),
    )
    if not cloned:
        return None

    return {
        "cloned": True,
        **cloned,
    }
