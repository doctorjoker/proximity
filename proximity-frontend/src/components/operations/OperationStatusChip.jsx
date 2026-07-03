import Chip from "@mui/material/Chip";

const STATUS = {
  CREATED: {
    label: "Created",
    color: "default",
  },

  PENDING: {
    label: "Pending",
    color: "warning",
  },

  RUNNING: {
    label: "Running",
    color: "info",
  },

  COMPLETED: {
    label: "Completed",
    color: "success",
  },

  FAILED: {
    label: "Failed",
    color: "error",
  },
};

export default function OperationStatusChip({ status }) {
  const cfg = STATUS[status] || {
    label: status || "Unknown",
    color: "default",
  };

  return (
    <Chip
      size="small"
      label={cfg.label}
      color={cfg.color}
      sx={{
        fontWeight: 700,
        minWidth: 105,
        justifyContent: "center",
      }}
    />
  );
}
