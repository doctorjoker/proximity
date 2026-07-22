export function executionStatus(item) {
  return String(
    item?.workflow_record?.status ||
    item?.workflow_engine_status ||
    item?.status ||
    "UNKNOWN",
  ).toUpperCase();
}

export function executionStatusLabel(status) {
  const value = String(status || "UNKNOWN").toUpperCase();
  if (["COMPLETED", "SUCCESS", "SUCCEEDED", "DONE"].includes(value)) return "Completata";
  if (["RUNNING", "IN_PROGRESS", "STARTED", "EXECUTING"].includes(value)) return "In esecuzione";
  if (["FAILED", "ERROR", "TIMEOUT"].includes(value)) return "Fallita";
  if (["PENDING", "QUEUED", "CREATED"].includes(value)) return "In attesa";
  if (["CANCELLED", "CANCELED", "ABORTED"].includes(value)) return "Annullata";
  return status || "Sconosciuta";
}

export function executionStatusColor(status) {
  const value = String(status || "UNKNOWN").toUpperCase();
  if (["COMPLETED", "SUCCESS", "SUCCEEDED", "DONE"].includes(value)) return "success";
  if (["RUNNING", "IN_PROGRESS", "STARTED", "EXECUTING"].includes(value)) return "info";
  if (["FAILED", "ERROR", "TIMEOUT"].includes(value)) return "error";
  if (["PENDING", "QUEUED", "CREATED"].includes(value)) return "warning";
  return "default";
}

export function executionCode(item) {
  return item?.execution_code || item?.workflow_code || item?.id || "n/d";
}

export function executionProcedureCode(item) {
  return item?.procedure_code || item?.workflow_type || item?.workflow_code || "";
}

export function executionStartedAt(item) {
  return item?.started_at || item?.created_at || item?.requested_at || null;
}

export function executionFinishedAt(item) {
  return item?.finished_at || item?.completed_at || item?.updated_at || null;
}

export function formatExecutionDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function executionDuration(item) {
  const start = executionStartedAt(item);
  const end = executionFinishedAt(item);
  if (!start) return "-";
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "-";
  const seconds = Math.floor((to - from) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function matchesExecutionQuery(item, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [
    executionCode(item),
    executionProcedureCode(item),
    item?.procedure_version,
    item?.requested_by,
    item?.current_step,
    item?.mode,
    executionStatus(item),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function normalizeTimelineItem(item, index) {
  return {
    ...item,
    key: item?.id || item?.event_id || `${index}-${item?.event_type || item?.status || "event"}`,
    title: item?.title || item?.event_type || item?.step_name || item?.phase_name || item?.status || `Evento ${index + 1}`,
    description: item?.description || item?.message || item?.detail || item?.error_message || "",
    timestamp: item?.created_at || item?.timestamp || item?.occurred_at || item?.started_at || null,
    status: item?.status || item?.result || item?.level || "",
  };
}
