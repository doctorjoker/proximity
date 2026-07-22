function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return Object.entries(parsed).map(([name, item]) => ({ name, ...(typeof item === "object" ? item : { default_value: item }) }));
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value).map(([name, item]) => ({ name, ...(typeof item === "object" ? item : { default_value: item }) }));
  }
  return [value];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function normalizeVariable(item, index, fallbackScope = "RUNTIME") {
  const source = typeof item === "string" ? { name: item } : (item || {});
  const rawScope = String(firstDefined(source.scope, source.variable_scope, source.direction, fallbackScope)).toUpperCase();
  const scope = rawScope.includes("INPUT") ? "INPUT" : rawScope.includes("OUTPUT") ? "OUTPUT" : rawScope.includes("SYSTEM") ? "SYSTEM" : "RUNTIME";
  const name = firstDefined(source.name, source.key, source.variable_name, source.code, `variable_${index + 1}`);
  return {
    ...source,
    id: firstDefined(source.id, source.variable_id, `${scope}:${name}`),
    name,
    label: firstDefined(source.label, source.display_name, name),
    scope,
    type: String(firstDefined(source.type, source.data_type, source.variable_type, "string")).toLowerCase(),
    description: firstDefined(source.description, source.notes, "Nessuna descrizione disponibile."),
    defaultValue: firstDefined(source.default_value, source.defaultValue, source.default, source.value, ""),
    required: Boolean(firstDefined(source.required, source.is_required, false)),
    secret: Boolean(firstDefined(source.secret, source.sensitive, source.is_secret, false)),
    source: firstDefined(source.source, source.origin, source.produced_by, scope === "INPUT" ? "Input procedura" : scope === "OUTPUT" ? "Output procedura" : "Runtime"),
    readBy: toArray(firstDefined(source.read_by, source.consumed_by, source.used_by, source.consumers)).map((entry) => typeof entry === "string" ? entry : firstDefined(entry?.name, entry?.phase_name, entry?.label)).filter(Boolean),
    writtenBy: toArray(firstDefined(source.written_by, source.produced_by_phases, source.producers)).map((entry) => typeof entry === "string" ? entry : firstDefined(entry?.name, entry?.phase_name, entry?.label)).filter(Boolean),
  };
}

function namesFromIO(value) {
  return toArray(value).map((entry) => typeof entry === "string" ? entry : firstDefined(entry?.name, entry?.key, entry?.variable_name)).filter(Boolean);
}

export function extractVariables(payload) {
  const root = payload?.item || payload?.version || payload || {};
  const collected = [];
  toArray(root.variables).forEach((item, index) => collected.push(normalizeVariable(item, index, "RUNTIME")));
  toArray(firstDefined(root.input_variables, root.inputs)).forEach((item, index) => collected.push(normalizeVariable(item, index, "INPUT")));
  toArray(firstDefined(root.output_variables, root.outputs)).forEach((item, index) => collected.push(normalizeVariable(item, index, "OUTPUT")));

  const phases = toArray(firstDefined(root.phases, payload?.phases, root.steps));
  phases.forEach((phase, phaseIndex) => {
    const phaseName = firstDefined(phase?.name, phase?.label, `Fase ${phaseIndex + 1}`);
    namesFromIO(firstDefined(phase?.input_variables, phase?.inputs)).forEach((name) => {
      collected.push(normalizeVariable({ name, read_by: [phaseName], source: "Fase precedente o input" }, collected.length, "RUNTIME"));
    });
    namesFromIO(firstDefined(phase?.output_variables, phase?.outputs)).forEach((name) => {
      collected.push(normalizeVariable({ name, written_by: [phaseName], source: phaseName }, collected.length, "RUNTIME"));
    });
  });

  const merged = new Map();
  collected.forEach((variable) => {
    const key = `${variable.scope}:${String(variable.name).toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, variable);
      return;
    }
    merged.set(key, {
      ...existing,
      ...variable,
      description: variable.description !== "Nessuna descrizione disponibile." ? variable.description : existing.description,
      defaultValue: variable.defaultValue !== "" ? variable.defaultValue : existing.defaultValue,
      readBy: [...new Set([...(existing.readBy || []), ...(variable.readBy || [])])],
      writtenBy: [...new Set([...(existing.writtenBy || []), ...(variable.writtenBy || [])])],
    });
  });
  return [...merged.values()].sort((a, b) => a.scope.localeCompare(b.scope) || a.name.localeCompare(b.name));
}

export const VARIABLE_SCOPES = [
  { value: "ALL", label: "Tutte" },
  { value: "INPUT", label: "Input" },
  { value: "RUNTIME", label: "Runtime" },
  { value: "OUTPUT", label: "Output" },
  { value: "SYSTEM", label: "Sistema" },
];

export function variableScopeLabel(scope) {
  return VARIABLE_SCOPES.find((item) => item.value === scope)?.label || scope || "n/d";
}
