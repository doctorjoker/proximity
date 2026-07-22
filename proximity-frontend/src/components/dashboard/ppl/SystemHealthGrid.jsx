import PropTypes from "prop-types";
import { Box, Chip, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";

function normalizeStatus(value) {
  const status = String(value || "").toUpperCase();
  if (["UP", "OK", "HEALTHY", "ONLINE", "RUNNING", "SUCCESS"].includes(status)) return "healthy";
  if (["DOWN", "ERROR", "FAILED", "OFFLINE", "UNHEALTHY"].includes(status)) return "error";
  return "unknown";
}

function HealthItem({ label, value }) {
  const state = normalizeStatus(value);
  const Icon = state === "healthy" ? CheckCircleRoundedIcon : state === "error" ? ErrorRoundedIcon : HelpRoundedIcon;
  const color = state === "healthy" ? "success" : state === "error" ? "error" : "default";

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ px: 1.5, py: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Icon fontSize="small" color={color === "default" ? "disabled" : color} />
        <Typography variant="body2" fontWeight={700} noWrap>{label}</Typography>
      </Stack>
      <Chip size="small" label={state === "healthy" ? "Operativo" : state === "error" ? "Errore" : "N/D"} color={color} variant={state === "unknown" ? "outlined" : "filled"} />
    </Stack>
  );
}

HealthItem.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.any };

export default function SystemHealthGrid({ health, errors = {} }) {
  const source = health || {};
  const items = [
    ["Backend", source.backend || source.status || (!errors.backend && health ? "OK" : errors.backend ? "ERROR" : "UNKNOWN")],
    ["ACS", source.acs || source.genieacs || (errors.devices ? "ERROR" : "UNKNOWN")],
    ["Database", source.database || source.db || "UNKNOWN"],
    ["Workflow Engine", source.workflow || source.workflow_engine || (errors.executions ? "ERROR" : "UNKNOWN")],
    ["Firmware", source.firmware || (errors.firmwareJobs ? "ERROR" : "UNKNOWN")],
    ["Scheduler", source.scheduler || source.workers || "UNKNOWN"],
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
      {items.map(([label, value]) => <HealthItem key={label} label={label} value={value} />)}
    </Box>
  );
}

SystemHealthGrid.propTypes = { health: PropTypes.object, errors: PropTypes.object };
