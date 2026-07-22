import re
from collections import Counter, defaultdict


START_TYPES = {"START", "TRIGGER"}
END_TYPES = {"END"}
VALID_PHASE_TYPES = {
    "START",
    "TRIGGER",
    "ACTION",
    "DECISION",
    "CONDITION",
    "WAIT",
    "DELAY",
    "END",
}


def _result(errors=None, warnings=None):
    return {
        "errors": errors or [],
        "warnings": warnings or [],
    }


def _issue(code, message, node_id=None, severity="ERROR", details=None):
    issue = {
        "code": code,
        "severity": severity,
        "node_id": str(node_id) if node_id is not None else None,
        "message": message,
    }
    if details:
        issue["details"] = details
    return issue


def _nodes(designer):
    return designer.get("nodes") or []


def _edges(designer):
    return designer.get("edges") or []


def _node_id(node):
    value = node.get("id")
    return str(value) if value is not None else None


def _node_data(node):
    return node.get("data") or {}


def _node_name(node):
    data = _node_data(node)
    value = data.get("name")
    if value is None:
        return ""
    return str(value).strip()


def _node_type(node):
    data = _node_data(node)
    value = data.get("type")
    if value is None:
        return ""
    return str(value).strip().upper()


def _is_start(node):
    return _node_type(node) in START_TYPES


def _is_end(node):
    return _node_type(node) in END_TYPES


def _edge_source(edge):
    value = edge.get("source")
    return str(value) if value is not None else None


def _edge_target(edge):
    value = edge.get("target")
    return str(value) if value is not None else None


def _edge_type(edge):
    value = edge.get("transition_type") or "SUCCESS"
    return str(value).strip().upper()


def _graph(designer):
    incoming = defaultdict(list)
    outgoing = defaultdict(list)

    for edge in _edges(designer):
        source = _edge_source(edge)
        target = _edge_target(edge)

        if source is not None:
            outgoing[source].append(edge)
        if target is not None:
            incoming[target].append(edge)

    return incoming, outgoing


class ValidationRule:
    code = "BASE"

    def validate(self, designer):
        return _result()


class EmptyWorkflowRule(ValidationRule):
    code = "EMPTY_WORKFLOW"

    def validate(self, designer):
        if _nodes(designer):
            return _result()

        return _result(errors=[
            _issue(
                self.code,
                "La procedura non contiene alcuna fase.",
            )
        ])


class MissingStartRule(ValidationRule):
    code = "MISSING_START"

    def validate(self, designer):
        nodes = _nodes(designer)
        if not nodes or any(_is_start(node) for node in nodes):
            return _result()

        return _result(errors=[
            _issue(
                self.code,
                "La procedura non contiene una fase Start.",
            )
        ])


class MultipleStartRule(ValidationRule):
    code = "MULTIPLE_START"

    def validate(self, designer):
        starts = [node for node in _nodes(designer) if _is_start(node)]
        if len(starts) <= 1:
            return _result()

        return _result(errors=[
            _issue(
                self.code,
                "La procedura contiene più di una fase Start.",
                node_id=_node_id(node),
                details={"start_count": len(starts)},
            )
            for node in starts
        ])


class MissingEndRule(ValidationRule):
    code = "MISSING_END"

    def validate(self, designer):
        nodes = _nodes(designer)
        if not nodes or any(_is_end(node) for node in nodes):
            return _result()

        return _result(errors=[
            _issue(
                self.code,
                "La procedura non contiene alcuna fase End.",
            )
        ])


class IsolatedPhaseRule(ValidationRule):
    code = "ISOLATED_PHASE"

    def validate(self, designer):
        nodes = _nodes(designer)
        if len(nodes) <= 1:
            return _result()

        incoming, outgoing = _graph(designer)
        errors = []

        for node in nodes:
            node_id = _node_id(node)
            if not incoming.get(node_id) and not outgoing.get(node_id):
                errors.append(
                    _issue(
                        self.code,
                        f'La fase "{_node_name(node) or node_id}" è isolata.',
                        node_id=node_id,
                    )
                )

        return _result(errors=errors)


class MissingIncomingTransitionRule(ValidationRule):
    code = "MISSING_INCOMING_TRANSITION"

    def validate(self, designer):
        nodes = _nodes(designer)
        if len(nodes) <= 1:
            return _result()

        incoming, _ = _graph(designer)
        errors = []

        for node in nodes:
            if _is_start(node):
                continue

            node_id = _node_id(node)
            if not incoming.get(node_id):
                errors.append(
                    _issue(
                        self.code,
                        f'La fase "{_node_name(node) or node_id}" non ha transizioni in ingresso.',
                        node_id=node_id,
                    )
                )

        return _result(errors=errors)


class MissingOutgoingTransitionRule(ValidationRule):
    code = "MISSING_OUTGOING_TRANSITION"

    def validate(self, designer):
        nodes = _nodes(designer)
        if len(nodes) <= 1:
            return _result()

        _, outgoing = _graph(designer)
        errors = []

        for node in nodes:
            if _is_end(node):
                continue

            node_id = _node_id(node)
            if not outgoing.get(node_id):
                errors.append(
                    _issue(
                        self.code,
                        f'La fase "{_node_name(node) or node_id}" non ha transizioni in uscita.',
                        node_id=node_id,
                    )
                )

        return _result(errors=errors)


class SelfLoopRule(ValidationRule):
    code = "SELF_LOOP"

    def validate(self, designer):
        errors = []

        for edge in _edges(designer):
            source = _edge_source(edge)
            target = _edge_target(edge)

            if source is not None and source == target:
                errors.append(
                    _issue(
                        self.code,
                        "Una transizione non può collegare una fase a se stessa.",
                        node_id=source,
                        details={"edge_id": edge.get("id")},
                    )
                )

        return _result(errors=errors)


class DuplicateTransitionRule(ValidationRule):
    code = "DUPLICATE_TRANSITION"

    def validate(self, designer):
        keys = [
            (_edge_source(edge), _edge_target(edge), _edge_type(edge))
            for edge in _edges(designer)
        ]
        counts = Counter(keys)
        emitted = set()
        errors = []

        for edge in _edges(designer):
            key = (_edge_source(edge), _edge_target(edge), _edge_type(edge))
            if counts[key] <= 1 or key in emitted:
                continue

            emitted.add(key)
            errors.append(
                _issue(
                    self.code,
                    "La procedura contiene transizioni duplicate.",
                    node_id=key[0],
                    details={
                        "source": key[0],
                        "target": key[1],
                        "transition_type": key[2],
                        "duplicate_count": counts[key],
                    },
                )
            )

        return _result(errors=errors)


class EmptyPhaseNameRule(ValidationRule):
    code = "EMPTY_PHASE_NAME"

    def validate(self, designer):
        errors = []

        for node in _nodes(designer):
            if _node_name(node):
                continue

            node_id = _node_id(node)
            errors.append(
                _issue(
                    self.code,
                    "La fase non ha un nome.",
                    node_id=node_id,
                )
            )

        return _result(errors=errors)


class InvalidPhaseTypeRule(ValidationRule):
    code = "INVALID_PHASE_TYPE"

    def validate(self, designer):
        errors = []

        for node in _nodes(designer):
            phase_type = _node_type(node)
            if phase_type in VALID_PHASE_TYPES:
                continue

            node_id = _node_id(node)
            errors.append(
                _issue(
                    self.code,
                    f'La fase "{_node_name(node) or node_id}" ha un tipo non valido.',
                    node_id=node_id,
                    details={"type": phase_type or None},
                )
            )

        return _result(errors=errors)


class InvalidTimeoutRule(ValidationRule):
    code = "INVALID_TIMEOUT"
    TIMEOUT_RE = re.compile(
        r"^\s*(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hour|hours)?\s*$",
        re.IGNORECASE,
    )

    def validate(self, designer):
        errors = []

        for node in _nodes(designer):
            data = _node_data(node)
            timeout = data.get("timeout")

            if timeout is None or timeout == "":
                continue

            match = self.TIMEOUT_RE.match(str(timeout))
            if match and float(match.group(1)) >= 0:
                continue

            node_id = _node_id(node)
            errors.append(
                _issue(
                    self.code,
                    f'La fase "{_node_name(node) or node_id}" ha un timeout non valido.',
                    node_id=node_id,
                    details={"timeout": timeout},
                )
            )

        return _result(errors=errors)


class InvalidRetryRule(ValidationRule):
    code = "INVALID_RETRY"

    def validate(self, designer):
        errors = []

        for node in _nodes(designer):
            data = _node_data(node)
            retry = data.get("retry", 0)

            try:
                numeric_retry = int(retry)
                valid = numeric_retry >= 0 and str(numeric_retry) == str(retry).strip()
            except (TypeError, ValueError):
                valid = False

            if valid:
                continue

            node_id = _node_id(node)
            errors.append(
                _issue(
                    self.code,
                    f'La fase "{_node_name(node) or node_id}" ha un valore retry non valido.',
                    node_id=node_id,
                    details={"retry": retry},
                )
            )

        return _result(errors=errors)


DEFAULT_RULES = [
    EmptyWorkflowRule(),
    MissingStartRule(),
    MultipleStartRule(),
    MissingEndRule(),
    IsolatedPhaseRule(),
    MissingIncomingTransitionRule(),
    MissingOutgoingTransitionRule(),
    SelfLoopRule(),
    DuplicateTransitionRule(),
    EmptyPhaseNameRule(),
    InvalidPhaseTypeRule(),
    InvalidTimeoutRule(),
    InvalidRetryRule(),
]
