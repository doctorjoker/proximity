from app.modules.service_workflows.handlers import (
    handle_replace_authorized_device,
    handle_wait_router_available,
    handle_restore_customer_service_configuration,
    handle_verify_customer_service,
)


WORKFLOW_HANDLERS_REGISTRY = {
    "replace_authorized_device": handle_replace_authorized_device,
    "wait_router_available": handle_wait_router_available,
    "restore_customer_service_configuration": handle_restore_customer_service_configuration,
    "verify_customer_service": handle_verify_customer_service,
}
