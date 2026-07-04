"""
EUREKA 8.0.0

Service Provisioning Orchestrator
"""

from .workflow import SERVICE_PROVISIONING_WORKFLOW

from .steps import (
    bind_device,
    configure_ppp,
    configure_wifi,
    configure_voip,
    verify_configuration,
    verify_runtime,
    complete,
)

from app.modules.service_workflows.service import record_event


STEP_HANDLERS = {
    "BIND_DEVICE": bind_device,
    "CONFIGURE_PPP": configure_ppp,
    "CONFIGURE_WIFI": configure_wifi,
    "CONFIGURE_VOIP": configure_voip,
    "VERIFY_CONFIGURATION": verify_configuration,
    "VERIFY_RUNTIME": verify_runtime,
    "COMPLETE": complete,
}


def execute_service_provisioning(
    workflow_code: str,
    context: dict,
):
    for step in SERVICE_PROVISIONING_WORKFLOW:

        step_name = step["step"]

        record_event(
            workflow_code=workflow_code,
            event_type=step_name,
            event_status="RUNNING",
            title=step["title"],
            description="Started",
        )

        handler = STEP_HANDLERS[step_name]

        result = handler(context)

        if not result["success"]:

            record_event(
                workflow_code=workflow_code,
                event_type=step_name,
                event_status="FAILED",
                title=step["title"],
                description=result["message"],
                metadata=result,
            )

            return result

        record_event(
            workflow_code=workflow_code,
            event_type=step_name,
            event_status="SUCCESS",
            title=step["title"],
            description=result["message"],
            metadata=result,
        )

    return {
        "success": True,
        "message": "Service provisioning completed",
    }
