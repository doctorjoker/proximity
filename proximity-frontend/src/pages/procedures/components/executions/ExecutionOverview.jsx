import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonIcon from "@mui/icons-material/Person";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ExecutionStatusChip from "./ExecutionStatusChip";

function formatDate(value) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "n/d";
  const total = Math.max(0, Number(seconds));
  if (Number.isNaN(total)) return "n/d";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
}

function progressColor(status) {
  const value = String(status || "").toUpperCase();
  if (value === "FAILED") return "error";
  if (["COMPLETED", "SUCCESS"].includes(value)) return "success";
  if (value === "QUEUED") return "inherit";
  return "primary";
}

function MetricCard({ icon, label, value, helper }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", minHeight: 108, borderRadius: 3 }}>
      <CardContent sx={{ p: 1.8, height: "100%" }}>
        <Stack direction="row" spacing={1.1} alignItems="flex-start">
          <Box sx={{ color: "primary.main", mt: 0.15 }}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={850}>{label}</Typography>
            <Typography fontWeight={900} sx={{ mt: 0.15, wordBreak: "break-word" }}>{value ?? "n/d"}</Typography>
            {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ExecutionOverview({ execution }) {
  if (!execution) return null;

  const workflow = execution.workflow_record || {};
  const status = workflow.status || execution.workflow_engine_status || execution.status;
  const rawProgress = Number(workflow.progress ?? execution.progress ?? 0);
  const progress = Math.max(0, Math.min(100, Number.isNaN(rawProgress) ? 0 : rawProgress));
  const duration = execution.duration_seconds ?? workflow.duration_seconds;

  return (
    <Stack spacing={2.2}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background: "linear-gradient(135deg, rgba(30,90,168,0.08), rgba(255,122,0,0.06))",
        }}
      >
        <CardContent sx={{ p: 2.2 }}>
          <Stack spacing={1.6}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.3} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={900}>Execution</Typography>
                <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: -0.5 }}>{execution.execution_code}</Typography>
                <Typography variant="body2" fontWeight={850}>{execution.procedure_name || execution.procedure_code}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Workflow {execution.workflow_code || "n/d"} · Versione {execution.procedure_version || "n/d"}
                </Typography>
              </Box>
              <ExecutionStatusChip status={status} size="medium" />
            </Stack>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.7 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={850}>Avanzamento</Typography>
                <Typography fontWeight={950}>{progress}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                color={progressColor(status)}
                sx={{
                  height: 9,
                  borderRadius: 99,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { borderRadius: 99 },
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.4} alignItems="stretch">
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<AccountTreeIcon fontSize="small" />} label="Procedura" value={execution.procedure_code} helper={`Versione ${execution.procedure_version || "n/d"}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<PlayArrowIcon fontSize="small" />} label="Step corrente" value={workflow.current_step || execution.current_step || "-"} helper={workflow.error_message || execution.error_message || "Nessun errore runtime"} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<PersonIcon fontSize="small" />} label="Richiesta da" value={execution.requested_by || "n/d"} helper={`Modalità ${execution.mode || "n/d"}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<AccessTimeIcon fontSize="small" />} label="Richiesta" value={formatDate(execution.requested_at || execution.created_at)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<AccessTimeIcon fontSize="small" />} label="Completata" value={formatDate(execution.completed_at || workflow.completed_at)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard icon={<AccessTimeIcon fontSize="small" />} label="Durata" value={formatDuration(duration)} />
        </Grid>
      </Grid>
    </Stack>
  );
}
