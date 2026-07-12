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
  return parsed.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const total = Number(seconds);
  if (Number.isNaN(total)) return "-";
  const minutes = Math.floor(total / 60);
  const remaining = Math.floor(total % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function effectiveStatus(item) {
  return item.workflow_engine_status || item.status;
}

export default function ExecutionTable({ items, loading, onSelect }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4, overflowX: "auto" }}>
      <Table size="medium" sx={{ minWidth: 1180 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 130 }}>Execution</TableCell>
            <TableCell sx={{ minWidth: 250 }}>Procedura</TableCell>
            <TableCell sx={{ minWidth: 210 }}>Workflow</TableCell>
            <TableCell sx={{ width: 105 }}>Stato</TableCell>
            <TableCell sx={{ minWidth: 160 }}>Progress</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Step</TableCell>
            <TableCell sx={{ width: 75 }}>Modo</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Richiedente</TableCell>
            <TableCell sx={{ width: 145 }}>Richiesta</TableCell>
            <TableCell align="right" sx={{ width: 75 }}>Durata</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const rawProgress = Number(item.progress ?? 0);
            const progress = Math.max(0, Math.min(100, Number.isNaN(rawProgress) ? 0 : rawProgress));
            const status = effectiveStatus(item);

            return (
              <TableRow
                key={item.execution_code}
                hover
                onClick={() => onSelect(item)}
                sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
              >
                <TableCell>
                  <Stack spacing={0.2}>
                    <Typography fontWeight={950} color="primary">{item.execution_code}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.id ? `ID ${item.id}` : "-"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={850} noWrap>{item.procedure_code}</Typography>
                    <Typography variant="caption" color="text.secondary">Versione {item.procedure_version || "n/d"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={850}>{item.workflow_code || "n/d"}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.workflow_type || "n/d"}</Typography>
                  </Stack>
                </TableCell>
                <TableCell><ExecutionStatusChip status={status} /></TableCell>
                <TableCell>
                  <Stack spacing={0.6}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={850}>{progress}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      color={status === "FAILED" ? "error" : status === "COMPLETED" || status === "SUCCESS" ? "success" : "primary"}
                      sx={{ height: 8, borderRadius: 99 }}
                    />
                  </Stack>
                </TableCell>
                <TableCell><Typography variant="body2" fontWeight={750}>{item.current_step || "-"}</Typography></TableCell>
                <TableCell>{item.mode || "-"}</TableCell>
                <TableCell>{item.requested_by || "n/d"}</TableCell>
                <TableCell>{formatDate(item.requested_at || item.created_at)}</TableCell>
                <TableCell align="right">{formatDuration(item.duration_seconds)}</TableCell>
              </TableRow>
            );
          })}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={10}>
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <Typography fontWeight={900}>Nessuna esecuzione disponibile</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Le esecuzioni compariranno qui dopo il primo run di una procedura.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
