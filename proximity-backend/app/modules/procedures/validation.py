"""
Public API for procedure workflow validation.
"""

from .validator import ProcedureValidator


def validate_procedure(designer: dict) -> dict:
    """
    Validate the designer payload returned by repository.get_designer().

    The returned structure is stable for both API consumers and the frontend:
    {
        "valid": bool,
        "errors": [...],
        "warnings": [...],
        "summary": {...}
    }
    """
    return ProcedureValidator().validate(designer or {})
