import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { fetchDiagnosticsHistory } from "../services/diagnosticsHistoryApi";

const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && value !== "");

function formatDate(value) {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("it-IT");
}

function stateColor(state) {
  const normalized = String(state || "").toUpperCase();
  if (["COMPLETE", "COMPLETED", "SUCCESS"].includes(normalized)) return "success";
  if (["FAILED", "ERROR", "TIMEOUT", "PARTIAL"].includes(normalized)) return "error";
  if (["RUNNING", "REQUESTED", "PENDING"].includes(normalized)) return "warning";
  return "default";
}

function metric(value, suffix = "") {
  return value === null || value === undefined ? "N/D" : `${value}${suffix}`;
}

export default function HistoryTab({ selected, overview, limit = 20 }) {
  const acsDeviceId = firstValue(
    overview?.acs_device_id,
    selected?.acs_device_id,
    overview?.device_id,
    selected?._id,
  );

  const [data, setData] = useState({ count: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    if (!acsDeviceId) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchDiagnosticsHistory(acsDeviceId, { limit }));
    } catch (err) {
      setError(err?.message || "Impossibile caricare lo storico diagnostiche.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [acsDeviceId, limit]);

  const items = useMemo(() => data?.items || [], [data]);

  if (!acsDeviceId) {
    return <Alert severity="warning">Identificativo ACS del dispositivo non disponibile.</Alert>;
  }

  return (
    <Box>
      {/* EUREKA28.1.1b_DIAGNOSTICS_HISTORY */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={900}>Storico diagnostiche</Typography>
          <Typography variant="body2" color="text.secondary">
            Esecuzioni persistite dal Diagnostics Center per {acsDeviceId}.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={load}
          disabled={loading}
          sx={{ borderRadius: 999, fontWeight: 850 }}
        >
          Aggiorna
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {!loading && items.length === 0 && <Alert severity="info">Nessun test diagnostico persistito.</Alert>}

      <Stack spacing={1.25}>
        {items.map((item, index) => {
          const executionKey = item.execution_id || item.id || `${item.started_at}-${index}`;
          const open = expanded === executionKey;
          return (
            <Card key={executionKey} variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography fontWeight={900}>{item.diagnostic_type || "DOWNLOAD"}</Typography>
                    <Chip size="small" label={item.state || item.phase || "N/D"} color={stateColor(item.state || item.phase)} sx={{ fontWeight: 850 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{formatDate(item.started_at || item.created_at)}</Typography>
                </Box>
                <Stack direction="row" spacing={3}>
                  <Box><Typography variant="caption" color="text.secondary">Throughput</Typography><Typography fontWeight={900}>{metric(item.throughput_mbps, " Mbps")}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Durata</Typography><Typography fontWeight={900}>{metric(item.duration_ms, " ms")}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">TCP Open</Typography><Typography fontWeight={900}>{metric(item.tcp_open_ms, " ms")}</Typography></Box>
                </Stack>
              </Stack>

              <Button
                size="small"
                sx={{ mt: 1, fontWeight: 800 }}
                endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setExpanded(open ? null : executionKey)}
              >
                Dettagli e timeline
              </Button>

              <Collapse in={open} unmountOnExit>
                <Divider sx={{ my: 1.25 }} />
                <Stack spacing={0.75}>
                  <Typography variant="body2"><b>URL:</b> {item.requested_url || item.download_url || "N/D"}</Typography>
                  <Typography variant="body2"><b>Dati ricevuti:</b> {metric(item.test_bytes_received, " byte")}</Typography>
                  <Typography variant="body2"><b>Completata:</b> {formatDate(item.completed_at)}</Typography>
                  {(item.events || []).map((event, eventIndex) => (
                    <Box key={`${event.id || event.event_key || event.phase}-${event.occurred_at}-${eventIndex}`} sx={{ pl: 1.25, borderLeft: "3px solid", borderColor: "divider" }}>
                      <Typography variant="body2" fontWeight={800}>{event.title || event.phase || event.event_key || "Evento"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(event.occurred_at || event.created_at)}{event.detail ? ` · ${event.detail}` : ""}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Collapse>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
