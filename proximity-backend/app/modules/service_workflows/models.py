from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkflowInstance:
    workflow_code: str
    workflow_type: str

    context: dict[str, Any] = field(default_factory=dict)

    status: str = "CREATED"
    current_step: str | None = None
    progress: int = 0

    def get(self, key: str, default=None):
        return self.context.get(key, default)

    def set(self, key: str, value):
        self.context[key] = value

    def update(self, values: dict):
        self.context.update(values)
