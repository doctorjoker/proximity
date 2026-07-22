from .definitions import WORKFLOW_DEFINITIONS
from .definitions_repository import get_published_definition


def _normalize_database_definition(row):
    definition_json = row.get("definition_json") or {}
    steps = definition_json.get("steps") or []

    normalized_steps = []

    for step in steps:
        normalized_steps.append(
            {
                "step": step.get("step") or step.get("name"),
                "progress": step.get("progress", 0),
                "handler": step.get("handler"),
            }
        )

    return normalized_steps


def load_workflow_definition(workflow_type: str):
    published = get_published_definition(workflow_type)

    if published:
        return _normalize_database_definition(published)

    return WORKFLOW_DEFINITIONS[workflow_type]
