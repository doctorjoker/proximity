import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DownloadDiagnosticsPanel from "./DownloadDiagnosticsPanel";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RouterRoundedIcon from "@mui/icons-material/RouterRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const POLL_MS = 2500;
const POLL_TIMEOUT_MS = 90000;

function metric(value, suffix = "") {
  return value === null || value === undefined ? "N/D" : `${value}${suffix}`;
}

function statusColor(state) {
  if (state === "COMPLETE") return "success";
  if (state === "ERROR" || state === "TIMEOUT") return "error";
  if (state === "REQUESTED" || state === "RUNNING") return "warning";
  return "default";
}

function statusLabel(state) {
  const labels = {
    IDLE: "Pronto",
    REQUESTED: "In attesa del CPE",
    RUNNING: "Test in esecuzione",
    COMPLETE: "Completato",
    ERROR: "Errore",
    TIMEOUT: "Timeout",
  };
  return labels[state] || state || "Pronto";
}

function qualityLabel(value) {
  return {
    EXCELLENT: "Eccellente",
    GOOD: "Buona",
    FAIR: "Discreta",
    POOR: "Critica",
    UNKNOWN: "N/D",
  }[value] || "N/D";
}

function MetricCard({ label, value, helper }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 900 }}>{value}</Typography>
        {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
      </CardContent>
    </Card>
  );
}

function nowLabel() {
  return new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventTone(type) {
  if (type === "success") return { bg: "rgba(22,163,74,.08)", border: "rgba(22,163,74,.28)", color: "success.main" };
  if (type === "error") return { bg: "rgba(220,38,38,.08)", border: "rgba(220,38,38,.28)", color: "error.main" };
  if (type === "running") return { bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.30)", color: "warning.main" };
  return { bg: "rgba(37,99,235,.07)", border: "rgba(37,99,235,.22)", color: "primary.main" };
}

function EventIcon({ type }) {
  if (type === "success") return <CheckCircleRoundedIcon fontSize="small" />;
  if (type === "error") return <ErrorRoundedIcon fontSize="small" />;
  if (type === "running") return <SyncRoundedIcon fontSize="small" sx={{ animation: "diag-spin 1.2s linear infinite" }} />;
  return <ScheduleRoundedIcon fontSize="small" />;
}

function EventCard({ event, active }) {
  const tone = eventTone(event.type);
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        boxShadow: active ? "0 8px 22px rgba(15,23,42,.08)" : "none",
        transition: "all .25s ease",
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Box sx={{ color: tone.color, mt: 0.15 }}><EventIcon type={event.type} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 850 }}>{event.title}</Typography>
            <Typography variant="caption" color="text.secondary">{event.at}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">{event.detail}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function phaseState(progress, threshold) {
  if (progress >= threshold) return "done";
  if (progress >= threshold - 24) return "active";
  return "pending";
}

function PhasePill({ label, threshold, progress }) {
  const state = phaseState(progress, threshold);
  return (
    <Box sx={{ flex: 1, minWidth: 110 }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: state === "done" ? "success.main" : state === "active" ? "warning.main" : "grey.300",
            boxShadow: state === "active" ? "0 0 0 5px rgba(245,158,11,.14)" : "none",
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: state === "pending" ? 650 : 850, color: state === "pending" ? "text.secondary" : "text.primary" }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}

export default function DiagnosticsTab({ device, overview }) {
  const acsDeviceId = useMemo(
    () => device?.acs_device_id || overview?.acs_device_id || device?._id || overview?._id || "",
    [device, overview],
  );
  const gateway = useMemo(
    () => overview?.ppp_remote_ip || overview?.ppp?.remote_ip || device?.ppp_remote_ip || device?.wan_gateway || "",
    [device, overview],
  );

  const historyKey = `proximity:ping-history:${acsDeviceId}`;
  const [host, setHost] = useState("1.1.1.1");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const savedSignatureRef = useRef("");
  const lastStateRef = useRef("");

  useEffect(() => {
    try { setHistory(JSON.parse(window.localStorage.getItem(historyKey) || "[]")); }
    catch { setHistory([]); }
  }, [historyKey]);

  const pushEvent = useCallback((title, detail, type = "info", uniqueKey = "") => {
    setEvents((current) => {
      if (uniqueKey && current.some((item) => item.key === uniqueKey)) return current;
      return [...current, { key: uniqueKey || `${Date.now()}-${title}`, at: nowLabel(), title, detail, type }].slice(-8);
    });
  }, []);

  const saveCompleted = useCallback((data) => {
    if (data?.state !== "COMPLETE") return;
    const signature = `${data.host}:${data.observed_at}:${data.average_response_time_ms}:${data.success_count}`;
    if (savedSignatureRef.current === signature) return;
    savedSignatureRef.current = signature;
    const entry = {
      host: data.host,
      average_response_time_ms: data.average_response_time_ms,
      packet_loss_percent: data.packet_loss_percent,
      success_count: data.success_count,
      packets_sent: data.packets_sent,
      quality: data.quality,
      observed_at: data.observed_at || new Date().toISOString(),
    };
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.observed_at !== entry.observed_at)].slice(0, 8);
      window.localStorage.setItem(historyKey, JSON.stringify(next));
      window.localStorage.setItem(`proximity:last-ping:${acsDeviceId}`, JSON.stringify(entry));
      window.dispatchEvent(new CustomEvent("proximity:diagnostics-updated", { detail: { acsDeviceId, entry } }));
      return next;
    });
  }, [acsDeviceId, historyKey]);

  const stopPolling = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const loadResult = useCallback(async ({ manual = false } = {}) => {
    if (!acsDeviceId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/ping/status`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      if (typeof data?.progress === "number") setProgress(data.progress);
      if (Array.isArray(data?.events)) {
        setEvents(data.events.map((event) => ({
          ...event,
          at: event.at ? new Date(event.at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : nowLabel(),
        })));
      }
      if (startedAtRef.current && ["REQUESTED", "RUNNING"].includes(data?.state) && elapsed > POLL_TIMEOUT_MS) data.state = "TIMEOUT";
      setResult(data);
      setPollCount((value) => value + 1);

      if (["REQUESTED", "RUNNING"].includes(data?.state) && !Array.isArray(data?.events)) {
        pushEvent(
          manual ? "Aggiornamento richiesto" : "Interrogazione CPE",
          manual ? "Richiesta manuale di aggiornamento dei parametri diagnostici." : "Proximity sta verificando lo stato della diagnostica sul CPE.",
          "running",
          manual ? `manual-${Date.now()}` : `poll-${Math.floor(elapsed / POLL_MS)}`,
        );
      }

      if (data?.state === "COMPLETE") {
        setProgress(100);
        pushEvent("Risultati ricevuti", `${data.success_count ?? 0}/${data.packets_sent ?? data.repetitions ?? 0} risposte, latenza media ${metric(data.average_response_time_ms, " ms")}.`, "success", "complete");
        saveCompleted(data);
        stopPolling();
      } else if (["ERROR", "TIMEOUT"].includes(data?.state)) {
        setProgress(100);
        pushEvent(data.state === "TIMEOUT" ? "Tempo massimo superato" : "Diagnostica fallita", data.state === "TIMEOUT" ? "Il CPE non ha restituito un risultato entro il tempo previsto." : "Il CPE ha terminato la diagnostica con errore.", "error", data.state.toLowerCase());
        stopPolling();
      }
      lastStateRef.current = data?.state || "";
    } catch (exc) {
      setError(exc?.message || "Impossibile leggere il risultato diagnostico.");
      pushEvent("Errore di comunicazione", "Impossibile leggere l'aggiornamento diagnostico dal backend.", "error", `read-error-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  }, [acsDeviceId, pushEvent, saveCompleted, stopPolling]);

  useEffect(() => {
    loadResult();
    return stopPolling;
  }, [loadResult, stopPolling]);

  const startPing = async (target = host) => {
    const cleanTarget = String(target || "").trim();
    if (!acsDeviceId || !cleanTarget) return;
    setHost(cleanTarget);
    setStarting(true);
    setError("");
    setEvents([]);
    setResult({
      state: "REQUESTED",
      host: cleanTarget,
      repetitions: 4,
      packets_sent: 4,
      success_count: null,
      failure_count: null,
      packet_loss_percent: null,
      minimum_response_time_ms: null,
      average_response_time_ms: null,
      maximum_response_time_ms: null,
      quality: "UNKNOWN",
    });
    setProgress(8);
    setPollCount(0);
    pushEvent("Test avviato", `Preparazione del test IP Ping verso ${cleanTarget}.`, "info", "start");
    startedAtRef.current = Date.now();
    savedSignatureRef.current = "";
    lastStateRef.current = "";
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: cleanTarget, repetitions: 4 }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setResult((previous) => ({ ...previous, ...data, host: cleanTarget }));
      setProgress(typeof data?.progress === "number" ? data.progress : 28);
      if (Array.isArray(data?.events)) {
        setEvents(data.events.map((event) => ({
          ...event,
          at: event.at ? new Date(event.at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : nowLabel(),
        })));
      } else {
        pushEvent("Task ACS creato", "GenieACS ha accettato la richiesta diagnostica.", "success", "task-created");
        pushEvent("Attesa del CPE", "Il backend richiederà automaticamente gli aggiornamenti IPPing fino al risultato.", "running", "waiting-cpe");
      }
      stopPolling();
      timerRef.current = window.setInterval(() => loadResult(), POLL_MS);
      window.setTimeout(() => loadResult(), 900);
    } catch (exc) {
      setError(exc?.message || "Impossibile avviare il ping.");
      setProgress(100);
      pushEvent("Avvio fallito", "La richiesta diagnostica non è stata accettata.", "error", "start-error");
    } finally {
      setStarting(false);
    }
  };

  const manualRefresh = async () => {
    if (!acsDeviceId) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/devices/${encodeURIComponent(acsDeviceId)}/diagnostics/ping/refresh`, { method: "POST" });
      setProgress((current) => Math.min(Math.max(current, 52) + 8, 88));
      pushEvent("Refresh ACS inviato", "Richiesto al CPE un aggiornamento immediato dell'oggetto IPPing.", "running", `refresh-${Date.now()}`);
      window.setTimeout(() => loadResult({ manual: true }), 800);
    } catch (exc) {
      setError(exc?.message || "Impossibile aggiornare la diagnostica.");
      pushEvent("Refresh non riuscito", "La richiesta di aggiornamento ACS non è stata completata.", "error", `refresh-error-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  if (!acsDeviceId) return <Alert severity="warning">ACS Device ID non disponibile.</Alert>;

  const waiting = ["REQUESTED", "RUNNING"].includes(result?.state);
  const replies = result?.success_count ?? 0;
  const sent = result?.packets_sent ?? result?.repetitions ?? 0;
  const executionActive = starting || loading || waiting;

  return (
    <Stack spacing={2.5} sx={{ "@keyframes diag-spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } } }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 950 }}>Console diagnostica</Typography>
        <Typography variant="body2" color="text.secondary">Orchestrazione automatica: task ACS, refresh periodici del CPE e risultati live.</Typography>
      </Box>

      <DownloadDiagnosticsPanel acsDeviceId={acsDeviceId} />

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.25, background: "linear-gradient(135deg, rgba(37,99,235,.08), rgba(14,165,233,.04))" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Esecuzione diagnostica</Typography>
              <Typography variant="body2" color="text.secondary">
                {executionActive ? "Il backend sta richiedendo automaticamente gli aggiornamenti al CPE." : "Avvia un test per seguire tutte le fasi in tempo reale."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={statusLabel(result?.state)} color={statusColor(result?.state)} />
              <Typography variant="h6" sx={{ fontWeight: 950 }}>{progress}%</Typography>
            </Stack>
          </Stack>

          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 14,
                borderRadius: 999,
                backgroundColor: "rgba(148,163,184,.2)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  background: progress === 100 && result?.state === "COMPLETE"
                    ? "linear-gradient(90deg, #16a34a, #22c55e)"
                    : progress === 100 && ["ERROR", "TIMEOUT"].includes(result?.state)
                      ? "linear-gradient(90deg, #dc2626, #ef4444)"
                      : "linear-gradient(90deg, #2563eb, #0ea5e9, #f59e0b)",
                  transition: "transform .7s ease",
                },
              }}
            />
            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <PhasePill label="Richiesta" threshold={20} progress={progress} />
              <PhasePill label="GenieACS" threshold={40} progress={progress} />
              <PhasePill label="CPE" threshold={65} progress={progress} />
              <PhasePill label="Risultati" threshold={90} progress={progress} />
              <PhasePill label="Completato" threshold={100} progress={progress} />
            </Stack>
          </Box>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Test rapidi</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<RouterRoundedIcon />} disabled={!gateway || starting} onClick={() => startPing(gateway)}>Gateway</Button>
                <Button size="small" variant="outlined" startIcon={<DnsRoundedIcon />} disabled={starting} onClick={() => startPing("1.1.1.1")}>DNS Cloudflare</Button>
                <Button size="small" variant="outlined" startIcon={<DnsRoundedIcon />} disabled={starting} onClick={() => startPing("8.8.8.8")}>DNS Google</Button>
                <Button size="small" variant="outlined" startIcon={<PublicRoundedIcon />} disabled={starting} onClick={() => startPing("speedtest.net")}>Internet</Button>
              </Stack>
              {!gateway && <Typography variant="caption" color="text.secondary">Gateway non disponibile nei dati correnti del CPE.</Typography>}
            </Box>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField fullWidth size="small" label="Host o indirizzo IP" value={host} onChange={(event) => setHost(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") startPing(); }} />
              <Button variant="contained" startIcon={starting ? <CircularProgress size={16} /> : <PlayArrowRoundedIcon />} disabled={starting || !host.trim()} onClick={() => startPing()} sx={{ minWidth: 150 }}>Avvia ping</Button>
              <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />} disabled={loading} onClick={manualRefresh}>Aggiorna CPE</Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">Device: {acsDeviceId} · interrogazioni live: {pollCount} · refresh automatici: {result?.refresh_attempts ?? 0}</Typography>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {result?.supported === false && <Alert severity="warning">Il dispositivo non espone un oggetto IPPing compatibile.</Alert>}

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Qualità rete" value={qualityLabel(result?.quality)} helper={result?.state === "COMPLETE" ? `${replies}/${sent} risposte` : statusLabel(result?.state)} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Latenza media" value={waiting ? "In attesa" : metric(result?.average_response_time_ms, " ms")} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Packet loss" value={waiting ? "In attesa" : metric(result?.packet_loss_percent, "%")} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Risposte" value={waiting ? "In esecuzione" : `${replies} / ${sent || "N/D"}`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Latenza minima" value={waiting ? "—" : metric(result?.minimum_response_time_ms, " ms")} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Latenza massima" value={waiting ? "—" : metric(result?.maximum_response_time_ms, " ms")} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Fallimenti" value={waiting ? "—" : metric(result?.failure_count)} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MetricCard label="Host testato" value={result?.host || host || "N/D"} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Timeline esecuzione</Typography>
                {executionActive && <Chip size="small" icon={<SyncRoundedIcon />} label="Live" color="warning" />}
              </Stack>
              {events.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nessun test avviato in questa sessione.</Typography>
              ) : (
                <Stack spacing={1.1}>{events.map((event, index) => <EventCard key={event.key} event={event} active={index === events.length - 1 && executionActive} />)}</Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 950, mb: 1.5 }}>Ultimi test</Typography>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nessun risultato completato salvato per questo dispositivo.</Typography>
              ) : (
                <Stack spacing={1.1}>
                  {history.map((item) => (
                    <Box key={item.observed_at} sx={{ p: 1.35, borderRadius: 2.25, border: "1px solid rgba(148,163,184,.24)", background: "rgba(248,250,252,.75)" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }} noWrap>{item.host}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(item.observed_at).toLocaleString("it-IT")}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ fontWeight: 950 }}>{metric(item.average_response_time_ms, " ms")}</Typography>
                          <Typography variant="caption" color="text.secondary">Loss {metric(item.packet_loss_percent, "%")}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
