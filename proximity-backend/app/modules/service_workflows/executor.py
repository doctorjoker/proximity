from .repository import get_workflow

from .runner import WorkflowRunner

from .registry import WORKFLOW_HANDLERS_REGISTRY

from .definition_loader import load_workflow_definition

from .models import WorkflowInstance


class WorkflowExecutor:

    def __init__(self):
        self.runner = WorkflowRunner(
            WORKFLOW_HANDLERS_REGISTRY,
        )

    async def execute(
        self,
        workflow_type: str,
        workflow_code: str,
        context: dict,
    ):
        workflow = get_workflow(workflow_code)

        if workflow is None:
            raise Exception(
                f"Workflow {workflow_code} not found"
            )

        instance = WorkflowInstance(
            workflow_code=workflow_code,
            workflow_type=workflow_type,
            context=context,
            status=workflow["status"],
            current_step=workflow["current_step"],
            progress=workflow["progress"],
        )

        workflow_definition = load_workflow_definition(
            workflow_type,
        )

        return await self.runner.run(
            workflow=instance,
            workflow_definition=workflow_definition,
        )
