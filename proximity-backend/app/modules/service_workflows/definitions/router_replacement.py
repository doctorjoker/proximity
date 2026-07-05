from .models import WorkflowDefinition, WorkflowStep


ROUTER_REPLACEMENT_WORKFLOW = WorkflowDefinition(
    workflow_type="ROUTER_REPLACEMENT",
    version="1.0",
    steps=[
        WorkflowStep(
            name="BINDING",
            progress=20,
            handler="replace_authorized_device",
        ),
        WorkflowStep(
            name="WAIT_ROUTER",
            progress=40,
            handler="wait_router_available",
        ),
        WorkflowStep(
            name="RESTORE",
            progress=70,
            handler="restore_customer_service_configuration",
        ),
        WorkflowStep(
            name="VERIFY",
            progress=90,
            handler="verify_customer_service",
        ),
    ],
)
