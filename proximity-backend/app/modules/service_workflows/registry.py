from app.modules.service_workflows.handlers import (
    handle_replace_authorized_device,
    handle_wait_router_available,
    handle_restore_customer_service_configuration,
    handle_verify_customer_service,
    handle_first_service_bind_device,
    handle_first_service_apply_configuration,
    handle_first_service_verify_service,
)

WORKFLOW_HANDLERS_REGISTRY = {
    "replace_authorized_device": handle_replace_authorized_device,
    "wait_router_available": handle_wait_router_available,
    "restore_customer_service_configuration": handle_restore_customer_service_configuration,
    "verify_customer_service": handle_verify_customer_service,
    "first_service_bind_device": handle_first_service_bind_device,
    "first_service_apply_configuration": handle_first_service_apply_configuration,
    "first_service_verify_service": handle_first_service_verify_service,
}
