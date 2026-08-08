
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card,
  CardContent, Chip, CircularProgress, FormControl, Grid, InputLabel,
  LinearProgress, MenuItem, Select, Stack, TextField, Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { listDiagnosticServers, validateDiagnosticServer } from "../services/diagnosticServersApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_URL = import.meta.env.VITE_TR143_DOWNLOAD_URL || "";
const POLL_MS = 2500;

const metric = (value, suffix = "") =>
  value === null || value === undefined ? "N/D" : `${value}${suffix}`;

const firstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

function statusColor(state) {
  if (["COMPLETE", "COMPLETED"].includes(state)) return "success";
  if (["ERROR", "FAILED", "TIMEOUT", "TIMED_OUT"].includes(state)) return "error";
  if (["REQUESTED", "RUNNING", "QUEUED"].includes(state)) return "warning";
  return "default";
}

function statusLabel(state) {
  const labels = {
    IDLE: "Pronto", REQUESTED: "Richiesto", RUNNING: "In esecuzione",
    QUEUED: "In coda", COMPLETE: "Completato", COMPLETED: "Completato",
    ERROR: "Errore", FAILED: "Fallito", TIMEOUT: "Timeout", TIMED_OUT: "Timeout",
  };
  return labels[state] || state || "Pronto";
}

function normalizeFiles(server) {
  return [
    server?.files, server?.diagnostic_files, server?.catalog_files, server?.download_files,
  ].find(Array.isArray) || [];
}

function buildFileUrl(server, file) {
  const direct = firstValue(file?.url, file?.download_url, file?.public_url, file?.file_url);
  if (direct) return direct;
  const base = firstValue(server?.base_url, server?.url, server?.endpoint, server?.public_url);
  const path = firstValue(file?.path, file?.relative_path, file?.filename, file?.name);
  if (!base || !path) return "";
  return `${String(base).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}

function ResultCard({ label, value }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function EventRow({ event, active }) {
  const isError = event.type === "error";
  const isSuccess = event.type === "success";
  const Icon = isError ? ErrorRoundedIcon : isSuccess ? CheckCircleRoundedIcon : SyncRoundedIcon;
  return (
    <Box sx={{
      p: 1.25, borderRadius: 2, border: "1px solid",
      borderColor: isError ? "error.light" : isSuccess ? "success.light" : "warning.light",
      bgcolor: isError ? "error.50" : isSuccess ? "success.50" : "warning.50",
    }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Icon
          fontSize="small"
          color={isError ? "error" : isSuccess ? "success" : "warning"}
          sx={active ? { animation: "tr143-spin 1.2s linear infinite" } : undefined}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>{event.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {event.at ? new Date(event.at).toLocaleTimeString("it-IT") : ""}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">{event.detail}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function DownloadDiagnosticsPanel({ acsDeviceId }) {
  const historyKey = useMemo(() => `proximity:download-history:${acsDeviceId}`, [acsDeviceId]);

  const [sourceMode, setSourceMode] = useState("CATALOG");
  const [servers, setServers] = useState([]);
  const [serverId, setServerId] = useState("");
  const [fileId, setFileId] = useState("");
  const [customUrl, setCustomUrl] = useState(DEFAULT_URL);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const [interfacePath, setInterfacePath] = useState(
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.",
  );
  const [dscp, setDscp] = useState(0);
  const [ethernetPriority, setEthernetPriority] = useState(0);

  const [capability, setCapability] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef(null);
  const savedSignatureRef = useRef("");

  const selectedServer = useMemo(
    () => servers.find((item) => String(item.id) === String(serverId)) || null,
    [serverId, servers],
  );
  const files = useMemo(() => normalizeFiles(selectedServer), [selectedServer]);
  const selectedFile = useMemo(
    () => files.find((item) => String(item.id) === String(fileId)) || null,
    [fileId, files],
  );
  const resolvedUrl = useMemo(
    () => sourceMode === "CUSTOM" ? customUrl.trim() : buildFileUrl(selectedServer, selectedFile),
    [customUrl, selectedFile, selectedServer, sourceMode],
  );

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(historyKey) || "[]")); }
    catch { setHistory([]); }
  }, [historyKey]);

  useEffect(() => {
    let mounted = true;
    listDiagnosticServers(false)
      .then((items) => {
        if (!mounted) return;
        setServers(items);
        if (items.length && !serverId) setServerId(String(items[0].id));
      })
      .catch((exc) => setError(exc?.message || "Impossibile caricare i server diagnostici."));
    return () => { mounted = false; };
  }, [serverId]);

  useEffect(() => {
    if (!files.length) {
      setFileId("");
      return;
    }
    if (!files.some((item) => String(item.id) === String(fileId))) {
      setFileId(String(files[0].id));
    }
  }, [fileId, files]);

  const stopPolling = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveCompleted = useCallback((data) => {
    if (!["COMPLETE", "COMPLETED"].includes(data?.state)) return;
    const signature = `${data.download_url}:${data.observed_at}:${data.throughput_mbps}`;
    if (savedSignatureRef.current === signature) return;
    savedSignatureRef.current = signature;
    const entry = {
      download_url: data.download_url,
      throughput_mbps: data.throughput_mbps,
      duration_ms: data.duration_ms,
      tcp_open_ms: data.tcp_open_ms,
      test_bytes_received: data.test_bytes_received || data.total_bytes_received,
      observed_at: data.observed_at || new Date().toISOString(),
    };
    setHistory((current) => {
      const next = [entry, ...current].slice(0, 8);
      localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }, [historyKey]);

  const loadCapability = useCallback(async () => {
    if (!acsDeviceId) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/capability`,
      );
      if (!response.ok) throw new Error(await response.text());
      setCapability(await response.json());
    } catch (exc) {
      setError(exc?.message || "Impossibile verificare il supporto TR-143.");
    }
  }, [acsDeviceId]);

  const loadStatus = useCallback(async () => {
    if (!acsDeviceId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/status`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setResult(data);
      if (["COMPLETE", "COMPLETED", "ERROR", "FAILED", "TIMEOUT", "TIMED_OUT"].includes(data?.state)) {
        stopPolling();
        saveCompleted(data);
      }
    } catch (exc) {
      setError(exc?.message || "Impossibile leggere la diagnostica download.");
    } finally {
      setLoading(false);
    }
  }, [acsDeviceId, saveCompleted, stopPolling]);

  useEffect(() => {
    loadCapability();
    return stopPolling;
  }, [loadCapability, stopPolling]);

  const validateSelected = async () => {
    if (!selectedServer?.id) return;
    setValidating(true);
    setError("");
    try {
      setValidation(await validateDiagnosticServer(selectedServer.id, selectedFile?.id || null));
    } catch (exc) {
      setValidation(null);
      setError(exc?.message || "Validazione server non riuscita.");
    } finally {
      setValidating(false);
    }
  };

  const startDownload = async () => {
    if (!resolvedUrl || !acsDeviceId) return;
    setStarting(true);
    setError("");
    savedSignatureRef.current = "";
    setResult({ state: "REQUESTED", progress: 8, download_url: resolvedUrl, events: [] });

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: resolvedUrl,
            interface: interfacePath.trim() || null,
            dscp: Number(dscp),
            ethernet_priority: Number(ethernetPriority),
          }),
        },
      );
      if (!response.ok) throw new Error(await response.text());
      setResult(await response.json());
      stopPolling();
      timerRef.current = window.setInterval(loadStatus, POLL_MS);
      window.setTimeout(loadStatus, 900);
    } catch (exc) {
      setError(exc?.message || "Impossibile avviare la diagnostica download.");
      setResult((current) => ({ ...current, state: "ERROR", progress: 100 }));
    } finally {
      setStarting(false);
    }
  };

  const manualRefresh = async () => {
    setLoading(true);
    try {
      await fetch(
        `${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/refresh`,
        { method: "POST" },
      );
      window.setTimeout(loadStatus, 700);
    } finally {
      setLoading(false);
    }
  };

  const waiting = ["REQUESTED", "RUNNING", "QUEUED"].includes(result?.state);
  const progress = result?.progress || 0;
  const bytes = result?.test_bytes_received || result?.total_bytes_received;

  return (
    <Card variant="outlined" sx={{
      borderRadius: 3,
      overflow: "hidden",
      "@keyframes tr143-spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
    }}>
      <Box sx={{ p: 2.25, background: "linear-gradient(135deg, rgba(124,58,237,.12), rgba(37,99,235,.06))" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <DownloadRoundedIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Speed Test Download TR-143</Typography>
              <Chip
                size="small"
                label={capability?.supported ? "Supportato" : capability ? "Non supportato" : "Verifica..."}
                color={capability?.supported ? "success" : "default"}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Server catalogato o URL personalizzato, parametri WAN avanzati e timeline completa.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={statusLabel(result?.state)} color={statusColor(result?.state)} />
            <Typography variant="h6" sx={{ fontWeight: 950 }}>{progress}%</Typography>
          </Stack>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 12, borderRadius: 999 }} />
      </Box>

      <CardContent>
        <Stack spacing={2}>
          {capability?.supported === false ? <Alert severity="warning">Questo CPE non espone DownloadDiagnostics TR-143.</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Origine del test</Typography>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25}>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel>Origine</InputLabel>
                <Select value={sourceMode} label="Origine" onChange={(event) => setSourceMode(event.target.value)}>
                  <MenuItem value="CATALOG">Server preconfigurato</MenuItem>
                  <MenuItem value="CUSTOM">URL personalizzato</MenuItem>
                </Select>
              </FormControl>

              {sourceMode === "CATALOG" ? (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Server diagnostico</InputLabel>
                    <Select value={serverId} label="Server diagnostico" onChange={(event) => setServerId(event.target.value)}>
                      {servers.map((server) => (
                        <MenuItem key={server.id} value={String(server.id)}>
                          {firstValue(server.display_name, server.name, server.code, `Server ${server.id}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth disabled={!files.length}>
                    <InputLabel>File diagnostico</InputLabel>
                    <Select value={fileId} label="File diagnostico" onChange={(event) => setFileId(event.target.value)}>
                      {files.map((file) => (
                        <MenuItem key={file.id} value={String(file.id)}>
                          {firstValue(file.display_name, file.name, file.filename, file.code, `File ${file.id}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    startIcon={validating ? <CircularProgress size={16} /> : <VerifiedRoundedIcon />}
                    onClick={validateSelected}
                    disabled={validating || !selectedServer}
                  >
                    Valida
                  </Button>
                </>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  label="URL file di test HTTP/FTP"
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                />
              )}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              URL risolto: {resolvedUrl || "N/D"}
            </Typography>
            {validation ? (
              <Chip
                size="small"
                sx={{ mt: 1 }}
                label={firstValue(validation.status, validation.result, "Validato")}
                color={validation.success === false ? "error" : "success"}
              />
            ) : null}
          </Box>

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Parametri avanzati</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1.25}>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Interfaccia WAN" value={interfacePath} onChange={(event) => setInterfacePath(event.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" type="number" label="DSCP" value={dscp} onChange={(event) => setDscp(event.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" type="number" label="Ethernet Priority" value={ethernetPriority} onChange={(event) => setEthernetPriority(event.target.value)} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Button variant="contained" startIcon={starting ? <CircularProgress size={16} /> : <DownloadRoundedIcon />} disabled={starting || !capability?.supported || !resolvedUrl} onClick={startDownload}>
              Avvia download
            </Button>
            <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />} disabled={loading || !result} onClick={manualRefresh}>
              Aggiorna CPE
            </Button>
          </Stack>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Download" value={waiting ? "In esecuzione" : metric(result?.throughput_mbps, " Mbps")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Durata trasferimento" value={waiting ? "—" : metric(result?.duration_ms, " ms")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="TCP Open" value={waiting ? "—" : metric(result?.tcp_open_ms, " ms")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Dati ricevuti" value={waiting ? "—" : bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "N/D"} /></Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Timeline download</Typography>
              {!result?.events?.length ? (
                <Alert severity="info">Nessuna esecuzione avviata.</Alert>
              ) : (
                <Stack spacing={1}>
                  {result.events.map((event, index) => (
                    <EventRow key={event.key} event={event} active={waiting && index === result.events.length - 1} />
                  ))}
                </Stack>
              )}
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Ultimi download</Typography>
              {!history.length ? (
                <Alert severity="info">Nessun test completato.</Alert>
              ) : (
                <Stack spacing={1}>
                  {history.map((item) => (
                    <Box key={`${item.observed_at}-${item.download_url}`} sx={{ p: 1.2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 850 }}>{item.download_url}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(item.observed_at).toLocaleString("it-IT")}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 950 }}>{metric(item.throughput_mbps, " Mbps")}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
