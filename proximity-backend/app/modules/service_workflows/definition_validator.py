from .registry import WORKFLOW_HANDLERS_REGISTRY


def validate_definition(
    definition_json: dict,
):
    errors = []
    warnings = []

    steps = definition_json.get("steps") or []

    if not steps:
        errors.append(
            {
                "code": "NO_STEPS",
                "message": "Workflow contains no steps",
            }
        )

    progress_values = []
    names = set()

    for index, step in enumerate(steps):

        name = step.get("name")
        handler = step.get("handler")
        progress = step.get("progress")

        if not name:
            errors.append(
                {
                    "code": "STEP_NAME_REQUIRED",
                    "message": f"Step #{index+1} has no name",
                }
            )

        elif name in names:
            errors.append(
                {
                    "code": "DUPLICATE_STEP_NAME",
                    "message": f"Duplicate step '{name}'",
                }
            )
        else:
            names.add(name)

        if handler not in WORKFLOW_HANDLERS_REGISTRY:
            errors.append(
                {
                    "code": "HANDLER_NOT_FOUND",
                    "message": f"Handler '{handler}' not registered",
                }
            )

        if not isinstance(progress, int):
            errors.append(
                {
                    "code": "INVALID_PROGRESS",
                    "message": f"{name}: progress must be integer",
                }
            )
            continue

        if progress < 0 or progress > 100:
            errors.append(
                {
                    "code": "INVALID_PROGRESS",
                    "message": f"{name}: progress must be between 0 and 100",
                }
            )

        progress_values.append(progress)

    if progress_values != sorted(progress_values):
        errors.append(
            {
                "code": "INVALID_PROGRESS_ORDER",
                "message": "Progress values must be increasing",
            }
        )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }
