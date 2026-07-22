from .validation_rules import DEFAULT_RULES


class ProcedureValidator:
    def __init__(self, rules=None):
        self.rules = list(rules or DEFAULT_RULES)

    def validate(self, designer: dict) -> dict:
        errors = []
        warnings = []

        for rule in self.rules:
            result = rule.validate(designer or {})
            errors.extend(result.get("errors", []))
            warnings.extend(result.get("warnings", []))

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "summary": {
                "error_count": len(errors),
                "warning_count": len(warnings),
                "rule_count": len(self.rules),
            },
        }
