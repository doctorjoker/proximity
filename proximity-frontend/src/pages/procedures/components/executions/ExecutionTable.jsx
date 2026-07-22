import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExecutionStatusChip from "./ExecutionStatusChip";

function formatDate(value) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const total = Number(seconds);
  if (Number.isNaN(total)) return "-";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = Math.floor(total % 60);
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function effectiveStatus(item) {
  return String(item.workflow_engine_status || item.workflow_record?.status || item.status || "").toUpperCase();
}

export default function ExecutionTable({ items, loading, selectedExecution, onSelect }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3.2, border: "1px solid #dbe5f0", overflowX: "auto", bgcolor: "#fff" }}>
      <Table size="medium" sx={{ minWidth: 1180 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8fafc" }}>
            {["Esecuzione", "Procedura", "Workflow", "Stato", "Avanzamento", "Step corrente", "Modo", "Richiedente", "Avviata il", "Durata"].map((label) => (
              <TableCell key={label} align={label === "Durata" ? "right" : "left"} sx={{ py: 1.35, color: "#475569", fontSize: 12, fontWeight: 950, borderBottom: "1px solid #dbe5f0", whiteSpace: "nowrap" }}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const rawProgress = Number(item.workflow_record?.progress ?? item.progress ?? 0);
            const progress = Math.max(0, Math.min(100, Number.isNaN(rawProgress) ? 0 : rawProgress));
            const status = effectiveStatus(item);
            const selected = selectedExecution?.execution_code === item.execution_code;
            const dotColor = status === "FAILED" ? "#dc2626" : ["COMPLETED", "SUCCESS"].includes(status) ? "#16a34a" : status === "RUNNING" ? "#f59e0b" : "#2563eb";

            return (
              <TableRow
                key={item.execution_code}
                hover
                selected={selected}
                onClick={() => onSelect(item)}
                sx={{ cursor: "pointer", "& td": { py: 1.4, borderBottom: "1px solid #edf2f7" }, "&.Mui-selected": { bgcolor: "#eff6ff" }, "&.Mui-selected:hover": { bgcolor: "#eaf3ff" } }}
              >
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: `${dotColor}18`, color: dotColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 950 }}>•</Box>
                    <Stack spacing={0.15}>
                      <Typography sx={{ color: "#1d4ed8", fontWeight: 950 }}>{item.execution_code}</Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>{item.id ? `ID ${item.id}` : "-"}</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.2}>
                    <Typography sx={{ color: "#0f172a", fontWeight: 850 }} noWrap>{item.procedure_code || "n/d"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>Versione {item.procedure_version || "n/d"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.2}>
                    <Typography sx={{ color: "#0f172a", fontWeight: 800 }}>{item.workflow_code || "n/d"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>{item.workflow_type || "n/d"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell><ExecutionStatusChip status={status} /></TableCell>
                <TableCell sx={{ minWidth: 150 }}>
                  <Stack spacing={0.6}>
                    <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 900 }}>{progress}%</Typography>
                    <LinearProgress variant="determinate" value={progress} color={status === "FAILED" ? "error" : ["COMPLETED", "SUCCESS"].includes(status) ? "success" : "primary"} sx={{ height: 6, borderRadius: 99, bgcolor: "#e2e8f0", "& .MuiLinearProgress-bar": { borderRadius: 99 } }} />
                  </Stack>
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ color: "#334155", fontWeight: 800 }}>{item.workflow_record?.current_step || item.current_step || "-"}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: "#334155", fontWeight: 750 }}>{item.mode || "-"}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: "#334155", fontWeight: 750 }}>{item.requested_by || "n/d"}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: "#334155" }}>{formatDate(item.requested_at || item.created_at)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" sx={{ color: "#334155", fontWeight: 750 }}>{formatDuration(item.duration_seconds)}</Typography></TableCell>
              </TableRow>
            );
          })}

          {!loading && items.length === 0 && (
            <TableRow><TableCell colSpan={10}><Box sx={{ py: 6, textAlign: "center" }}><Typography sx={{ color: "#0f172a", fontWeight: 950 }}>Nessuna esecuzione disponibile</Typography><Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>Modifica i filtri oppure avvia una Procedura Automatica.</Typography></Box></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
