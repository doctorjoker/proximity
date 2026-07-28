import {
  Box, Chip, IconButton, LinearProgress, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, Tooltip, Typography,
} from "@mui/material";
import { getProximityIconConfig } from "../../components/icons/proximityIconRegistry";
import { formatDate, formatDuration, getDiagnosticTone, getResourceTone, safeNumber, safeText } from "./diagnosticsUtils";

const OpenIcon = getProximityIconConfig("DIAGNOSTICS").icon;

function MetricBar({ value }) {
  const number = safeNumber(value, null);
  if (number === null) return <Typography variant="body2" color="text.secondary">N/D</Typography>;
  const tone = getResourceTone(number);
  return (
    <Box sx={{ minWidth: 90 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight={850}>{Math.round(number)}%</Typography>
        <Typography variant="caption" color="text.secondary">{tone.label}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, number))}
        sx={{ mt: 0.75, height: 6, borderRadius: 99, "& .MuiLinearProgress-bar": { backgroundColor: tone.color } }}
      />
    </Box>
  );
}

export default function DiagnosticsTable({ rows, total, page, rowsPerPage, onPageChange, onRowsPerPageChange, onOpen, loading }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
      {loading && <LinearProgress />}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>Device / Cliente</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Stato</TableCell>
              <TableCell sx={{ fontWeight: 900, minWidth: 170 }}>Health</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CPU</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Memoria</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Uptime</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Ultimo Inform</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900 }}>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const tone = getDiagnosticTone(row.diagnostics);
              const score = safeNumber(row.diagnostics?.health_score, null);
              return (
                <TableRow key={row.id} hover sx={{ "& td": { py: 1.6 } }}>
                  <TableCell>
                    <Typography fontWeight={950}>{safeText(row.manufacturer)} {safeText(row.model)}</Typography>
                    <Typography variant="body2" color="text.secondary">{safeText(row.customer_name, "Cliente non associato")}</Typography>
                    <Typography variant="caption" color="text.secondary">{safeText(row.device_code)} · {safeText(row.serial_number)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.online ? "ONLINE" : "OFFLINE"} color={row.online ? "success" : "default"} sx={{ fontWeight: 900 }} />
                  </TableCell>
                  <TableCell>
                    {score === null ? (
                      <Chip size="small" label="N/D" color="default" sx={{ fontWeight: 900 }} />
                    ) : (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography fontWeight={950}>{score}/100</Typography>
                          <Chip size="small" label={tone.label} color={tone.color} sx={{ fontWeight: 900 }} />
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={score}
                          sx={{ mt: 0.8, height: 7, borderRadius: 99, "& .MuiLinearProgress-bar": { backgroundColor: tone.accent } }}
                        />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell><MetricBar value={row.diagnostics?.cpu_usage_percent} /></TableCell>
                  <TableCell><MetricBar value={row.diagnostics?.memory_used_percent} /></TableCell>
                  <TableCell><Typography fontWeight={800}>{formatDuration(row.diagnostics?.uptime_seconds)}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{formatDate(row.last_seen)}</Typography></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Apri console diagnostica">
                      <IconButton size="small" color="primary" onClick={() => onOpen(row)} aria-label="Apri diagnostica">
                        <OpenIcon size={18} stroke={1.9} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && !loading && (
              <TableRow><TableCell colSpan={8}><Box sx={{ p: 5, textAlign: "center" }}>Nessun dispositivo corrisponde ai filtri.</Box></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]} />
    </Paper>
  );
}
