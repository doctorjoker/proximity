from app.modules.service_workflows.service import (
    workflow_running,
    workflow_completed,
    workflow_failed,
)


class WorkflowRunner:

    def __init__(self, handlers: dict):
        self.handlers = handlers

    async def run(
        self,
        workflow_code: str,
        workflow_definition: list,
        context: dict,
    ):
        try:
            for step in workflow_definition:
                step_name = step["step"]
                progress = step["progress"]
                handler_name = step["handler"]

                workflow_running(
                    workflow_code,
                    step_name,
                    progress,
                )

                handler = self.handlers[handler_name]

                result = await handler(context)

                context_key = {
                    "BINDING": "binding",
                    "WAIT_ROUTER": "availability",
                    "RESTORE": "restore",
                    "VERIFY": "verification",
                }.get(step_name, step_name.lower())

                context[context_key] = result

                if isinstance(result, dict) and result.get("success") is False:
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
