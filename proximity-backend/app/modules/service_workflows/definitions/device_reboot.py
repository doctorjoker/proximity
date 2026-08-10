from .models import WorkflowDefinition, WorkflowStep

DEVICE_REBOOT_WORKFLOW = WorkflowDefinition(
    workflow_type="DEVICE_REBOOT",
    version="1.0",
    steps=[
        WorkflowStep(
            name="REBOOT",
            handler="device_reboot",
            progress=90,
        ),
    ],
)
