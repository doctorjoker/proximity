from .models import WorkflowDefinition, WorkflowStep


FIRST_SERVICE_PROVISIONING_WORKFLOW = WorkflowDefinition(
    workflow_type="FIRST_SERVICE_PROVISIONING",
    version="1.0",
    steps=[
        WorkflowStep(
            name="BINDING",
            handler="first_service_bind_device",
            progress=20,
        ),
        WorkflowStep(
            name="PROVISIONING",
            handler="first_service_apply_configuration",
            progress=60,
        ),
        WorkflowStep(
            name="VERIFY",
            handler="first_service_verify_service",
            progress=90,
        ),
    ],
)
