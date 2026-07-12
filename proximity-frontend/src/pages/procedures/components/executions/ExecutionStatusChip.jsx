import { Chip } from "@mui/material";

const STATUS_LABELS = {
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  SUCCESS: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
};

const STATUS_COLORS = {
  QUEUED: "info",
  RUNNING: "warning",
  COMPLETED: "success",
  SUCCESS: "success",
  FAILED: "error",
  CANCELLED: "default",
  CANCELED: "default",
};

export function normalizeExecutionStatus(status) {
  const key = String(status || "").toUpperCase();
  return STATUS_LABELS[key] || status || "n/d";
}

export function executionStatusColor(status) {
  const key = String(status || "").toUpperCase();
  return STATUS_COLORS[key] || "default";
}

export default function ExecutionStatusChip({ status, size = "small", variant }) {
  const color = executionStatusColor(status);

  return (
    <Chip
      size={size}
      label={normalizeExecutionStatus(status)}
      color={color}
      variant={variant || (color === "default" ? "outlined" : "filled")}
      sx={{
        minWidth: 82,
        height: size === "medium" ? 30 : 24,
        fontWeight: 900,
        letterSpacing: 0.1,
        "& .MuiChip-label": { px: 1.1 },
      }}
    />
  );
}
