from app.modules.desired_config.service import restore_service_configuration


async def restore_customer_service_configuration(
    service_code: str,
    acs_device_id: str,
):
    restore = await restore_service_configuration(
        service_code,
        acs_device_id,
    )

    summary = {
        "pppoe": "NOT_CONFIGURED",
        "wifi": "NOT_CONFIGURED",
        "voip": "NOT_CONFIGURED",
    }

    actions = restore.get("actions", [])

    for action in actions:
        action_type = action.get("type")
        task = action.get("task") or {}

        task_failed = task.get("success") is False

        if action_type == "PPPOE":
            summary["pppoe"] = "FAILED" if task_failed else "OK"

        elif action_type == "WIFI":
            summary["wifi"] = "FAILED" if task_failed else "OK"

        elif action_type == "VOIP":
            summary["voip"] = "FAILED" if task_failed else "OK"

    if restore.get("authorized") is False:
        return {
            "success": False,
            "service_code": service_code,
            "acs_device_id": acs_device_id,
            "state": "NOT_AUTHORIZED",
            "reason": restore.get("reason"),
            "summary": summary,
            "restore": restore,
        }

    ok_count = sum(1 for value in summary.values() if value == "OK")
    failed_count = sum(1 for value in summary.values() if value == "FAILED")

    if failed_count > 0:
        state = "RESTORE_FAILED"
    elif ok_count > 0:
        state = "RESTORED"
    else:
        state = "NO_CONFIGURATION"

    return {
        "success": True,
        "service_code": service_code,
        "acs_device_id": acs_device_id,
        "state": state,
        "summary": summary,
        "restore": restore,
    }
