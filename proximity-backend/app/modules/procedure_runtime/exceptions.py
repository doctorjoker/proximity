class ProcedureRuntimeError(Exception):
    """Base exception for the procedure runtime engine."""

    code = "PROCEDURE_RUNTIME_ERROR"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class RuntimeValidationError(ProcedureRuntimeError):
    code = "RUNTIME_VALIDATION_ERROR"


class HandlerNotFoundError(ProcedureRuntimeError):
    code = "HANDLER_NOT_FOUND"


class HandlerExecutionError(ProcedureRuntimeError):
    code = "HANDLER_EXECUTION_ERROR"


class PhaseExecutionError(ProcedureRuntimeError):
    code = "PHASE_EXECUTION_ERROR"
