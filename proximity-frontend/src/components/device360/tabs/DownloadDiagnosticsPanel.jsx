import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_URL = import.meta.env.VITE_TR143_DOWNLOAD_URL || "";
const POLL_MS = 2500;

const metric = (value, suffix = "") => value === null || value === undefined ? "N/D" : `${value}${suffix}`;

function statusColor(state) {
  if (state === "COMPLETE") return "success";
  if (["ERROR", "TIMEOUT"].includes(state)) return "error";
  if (["REQUESTED", "RUNNING"].includes(state)) return "warning";
  return "default";
}

function statusLabel(state) {
  const labels = {
    IDLE: "Pronto",
    REQUESTED: "Richiesto",
    RUNNING: "In esecuzione",
    COMPLETE: "Completato",
    ERROR: "Errore",
    TIMEOUT: "Timeout",
  };
  return labels[state] || state || "Pronto";
}

function ResultCard({ label, value, helper }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 950 }}>{value}</Typography>
        {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
      </CardContent>
    </Card>
  );
}

function EventRow({ event, active }) {
  const isError = event.type === "error";
  const isSuccess = event.type === "success";
  const Icon = isError ? ErrorRoundedIcon : isSuccess ? CheckCircleRoundedIcon : SyncRoundedIcon;
  return (
    <Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: isError ? "error.light" : isSuccess ? "success.light" : "warning.light", bgcolor: isError ? "error.50" : isSuccess ? "success.50" : "warning.50" }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Icon fontSize="small" color={isError ? "error" : isSuccess ? "success" : "warning"} sx={active ? { animation: "tr143-spin 1.2s linear infinite" } : undefined} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>{event.title}</Typography>
            <Typography variant="caption" color="text.secondary">{event.at ? new Date(event.at).toLocaleTimeString("it-IT") : ""}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">{event.detail}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function DownloadDiagnosticsPanel({ acsDeviceId }) {
  const historyKey = useMemo(() => `proximity:download-history:${acsDeviceId}`, [acsDeviceId]);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [capability, setCapability] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const savedSignatureRef = useRef("");

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(historyKey) || "[]")); }
    catch { setHistory([]); }
  }, [historyKey]);

  const stopPolling = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveCompleted = useCallback((data) => {
    if (data?.state !== "COMPLETE") return;
    const signature = `${data.download_url}:${data.observed_at}:${data.throughput_mbps}`;
    if (savedSignatureRef.current === signature) return;
    savedSignatureRef.current = signature;
    const entry = {
      download_url: data.download_url,
      throughput_mbps: data.throughput_mbps,
      duration_ms: data.duration_ms,
      test_bytes_received: data.test_bytes_received || data.total_bytes_received,
      observed_at: data.observed_at || new Date().toISOString(),
    };
    setHistory((current) => {
      const next = [entry, ...current].slice(0, 6);
      localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }, [historyKey]);

  const loadCapability = useCallback(async () => {
    if (!acsDeviceId) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/capability`);
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
      const response = await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/status`, { method: "POST" });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setResult(data);
      if (["COMPLETE", "ERROR", "TIMEOUT"].includes(data?.state)) {
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

  const startDownload = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl || !acsDeviceId) return;
    setStarting(true);
    setError("");
    savedSignatureRef.current = "";
    setResult({ state: "REQUESTED", progress: 8, download_url: cleanUrl, events: [] });
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
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
      await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/download/refresh`, { method: "POST" });
      window.setTimeout(loadStatus, 700);
    } finally {
      setLoading(false);
    }
  };

  const waiting = ["REQUESTED", "RUNNING"].includes(result?.state);
  const progress = result?.progress || 0;
  const bytes = result?.test_bytes_received || result?.total_bytes_received;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", "@keyframes tr143-spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } } }}>
      <Box sx={{ p: 2.25, background: "linear-gradient(135deg, rgba(124,58,237,.10), rgba(37,99,235,.05))" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <DownloadRoundedIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Speed Test Download TR-143</Typography>
              <Chip size="small" label={capability?.supported ? "Supportato" : capability ? "Non supportato" : "Verifica..."} color={capability?.supported ? "success" : "default"} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Il download viene eseguito direttamente dal CPE, non dal browser dell'operatore.</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={statusLabel(result?.state)} color={statusColor(result?.state)} />
            <Typography variant="h6" sx={{ fontWeight: 950 }}>{progress}%</Typography>
          </Stack>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 12, borderRadius: 999, "& .MuiLinearProgress-bar": { borderRadius: 999, background: result?.state === "COMPLETE" ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#7c3aed,#2563eb,#0ea5e9)" } }} />
      </Box>

      <CardContent>
        <Stack spacing={2}>
          {capability?.supported === false && <Alert severity="warning">Questo CPE non espone DownloadDiagnostics TR-143.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField fullWidth size="small" label="URL file di test HTTP/FTP" placeholder="http://speedtest.speednetwifi.it/10MB.bin" value={url} onChange={(event) => setUrl(event.target.value)} />
            <Button variant="contained" startIcon={starting ? <CircularProgress size={16} /> : <DownloadRoundedIcon />} disabled={starting || !capability?.supported || !url.trim()} onClick={startDownload} sx={{ minWidth: 180 }}>Avvia download</Button>
            <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />} disabled={loading || !result} onClick={manualRefresh}>Aggiorna CPE</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">Trasporti dichiarati: {capability?.download_transports || "N/D"} · refresh automatici: {result?.refresh_attempts || 0}</Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Download" value={waiting ? "In esecuzione" : metric(result?.throughput_mbps, " Mbps")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Durata trasferimento" value={waiting ? "—" : metric(result?.duration_ms, " ms")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="TCP Open" value={waiting ? "—" : metric(result?.tcp_open_ms, " ms")} /></Grid>
            <Grid item xs={12} sm={6} md={3}><ResultCard label="Dati ricevuti" value={waiting ? "—" : bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "N/D"} /></Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Timeline download</Typography>
                {!result?.events?.length ? <Typography variant="body2" color="text.secondary">Nessuna esecuzione avviata.</Typography> : <Stack spacing={1}>{result.events.map((event, index) => <EventRow key={event.key} event={event} active={waiting && index === result.events.length - 1} />)}</Stack>}
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1 }}>Ultimi download</Typography>
                {!history.length ? <Typography variant="body2" color="text.secondary">Nessun test completato.</Typography> : <Stack spacing={1}>{history.map((item) => <Box key={`${item.observed_at}-${item.download_url}`} sx={{ p: 1.2, borderRadius: 2, border: "1px solid rgba(148,163,184,.25)" }}><Stack direction="row" justifyContent="space-between" spacing={1}><Box sx={{ minWidth: 0 }}><Typography variant="body2" noWrap sx={{ fontWeight: 850 }}>{item.download_url}</Typography><Typography variant="caption" color="text.secondary">{new Date(item.observed_at).toLocaleString("it-IT")}</Typography></Box><Typography variant="body2" sx={{ fontWeight: 950, whiteSpace: "nowrap" }}>{metric(item.throughput_mbps, " Mbps")}</Typography></Stack></Box>)}</Stack>}
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
