from app.modules.service_workflows.service import (
    workflow_running,
    workflow_completed,
    workflow_failed,
    workflow_step_started,
    workflow_step_completed,
    workflow_step_failed,
)

from app.modules.service_workflows.models import WorkflowInstance


class WorkflowRunner:

    def __init__(self, handlers: dict):
        self.handlers = handlers

    async def run(
        self,
        workflow: WorkflowInstance,
        workflow_definition,
    ):
        workflow_code = workflow.workflow_code
        context = workflow.context

        try:
            steps = (
                workflow_definition.steps
                if hasattr(workflow_definition, "steps")
                else workflow_definition
            )

            for step in steps:
                if hasattr(step, "name"):
                    step_name = step.name
                    progress = step.progress
                    handler_name = step.handler
                else:
                    step_name = step["step"]
                    progress = step["progress"]
                    handler_name = step["handler"]

                workflow_running(
                    workflow_code,
                    step_name,
                    progress,
                )

                step_record = workflow_step_started(
                    workflow_code,
                    step_name,
                    {
                        "handler": handler_name,
                    },
                )

                handler = self.handlers[handler_name]

                result = await handler(context)

                context_key = {
                    "BINDING": "binding",
                    "WAIT_ROUTER": "availability",
                    "RESTORE": "restore",
                    "PROVISIONING": "provisioning",
                    "VERIFY": "verification",
                }.get(step_name, step_name.lower())

                context[context_key] = result

                if isinstance(result, dict) and result.get("success") is False:
                    workflow_step_failed(
                        step_record["id"],
                        step_name,
                        result.get("reason", "Step failed"),
                        {
                            "success": False,
                            "state": result.get("state"),
                        },
                    )

                    workflow_failed(
                        workflow_code,
                        step_name,
                        result.get("reason", "Step failed"),
                    )

                    return {
                        "success": False,
                        "workflow_code": workflow_code,
                        "failed_step": step_name,
                        "result": result,
                        "context": context,
                    }

                workflow_step_completed(
                    step_record["id"],
                    {
                        "success": (
                            result.get("success", True)
                            if isinstance(result, dict)
                            else True
                        ),
                        "state": (
                            result.get("state")
                            if isinstance(result, dict)
                            else None
                        ),
                    },
                )

            workflow_completed(
                workflow_code,
                {
                    "state": context.get("state", "COMPLETED"),
                    "steps": list(context.keys()),
                },
            )

            return {
                "success": True,
                "workflow_code": workflow_code,
                "context": context,
            }

        except Exception as exc:
            workflow_failed(
                workflow_code,
                "WORKFLOW_EXCEPTION",
                str(exc),
            )

            return {
                "success": False,
                "workflow_code": workflow_code,
                "error": str(exc),
                "context": context,
            }
