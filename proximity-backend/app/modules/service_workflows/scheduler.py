from app.modules.service_workflows.executor import WorkflowExecutor


executor = WorkflowExecutor()


async def schedule_workflow_execution(
    workflow_type: str,
    workflow_code: str,
    context: dict,
):
    return await executor.execute(
        workflow_type=workflow_type,
        workflow_code=workflow_code,
        context=context,
    )
