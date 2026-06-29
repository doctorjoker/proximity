from .repository import get_workflow

from .runner import WorkflowRunner

from .registry import WORKFLOW_HANDLERS_REGISTRY

from .definitions import WORKFLOW_DEFINITIONS


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

        workflow_definition = WORKFLOW_DEFINITIONS[workflow_type]

        return await self.runner.run(
            workflow_code=workflow_code,
            workflow_definition=workflow_definition,
            context=context,
        )
