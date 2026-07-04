from dataclasses import dataclass, field


@dataclass(slots=True)
class WorkflowStep:
    name: str
    handler: str
    progress: int
    timeout: int = 300
    retry: int = 0
    rollback: str | None = None
    required: bool = True


@dataclass(slots=True)
class WorkflowDefinition:
    workflow_type: str
    version: str
    steps: list[WorkflowStep] = field(default_factory=list)
