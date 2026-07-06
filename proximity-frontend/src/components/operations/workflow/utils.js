export function statusColor(status) {
  if (status === "COMPLETED" || status === "SUCCESS") return "success";
  if (status === "RUNNING") return "primary";
  if (status === "FAILED" || status === "CANCELLED") return "error";
  if (status === "PAUSED") return "warning";
  return "default";
}

export function translateStep(stepName) {
  const mapping = {
    INITIALIZED: "Initialized",
    BINDING: "Binding Router",
    WAIT_ROUTER: "Waiting Router Online",
    RESTORE: "Restoring Configuration",
    PROVISIONING: "Applying Service Configuration",
    VERIFY: "Verifying Service",
    FINISHED: "Finished",
    CANCELLED: "Cancelled",
    PAUSED: "Paused",
  };

  return mapping[stepName] || String(stepName || "-").replaceAll("_", " ");
}

export function formatDuration(durationMs) {
  if (!durationMs) return "-";

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
