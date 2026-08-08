import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconClock,
  IconCpu,
  IconDatabase,
  IconPlugConnected,
  IconRefresh,
  IconServer,
} from "@tabler/icons-react";

const formatDuration = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "N/D";
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  if (days > 0) return `${days}g ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const ageLabel = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  return `rilevato ${formatDuration(seconds)} fa`;
};

const metricLabel = (metric, formatter = (value) => String(value)) => {
  if (!metric) return { value: "N/D", helper: "Metrica non disponibile", tone: "default" };
  if (metric.status === "UNSUPPORTED") {
    return { value: "Non supportato", helper: metric.reason || "Non esposto dal firmware", tone: "default" };
  }
  if (metric.status === "NOT_DISCOVERED") {
    return { value: "Non rilevato", helper: metric.reason || "Parametro non trovato", tone: "warning" };
  }
  if (metric.status === "STALE") {
    const lastValue =
      metric.value !== null && metric.value !== undefined
        ? formatter(metric.value)
        : null;

    return {
      value: "Dato obsoleto",
      helper: lastValue
        ? `Ultimo valore: ${lastValue} · ${ageLabel(metric.age_seconds)}`
        : ageLabel(metric.age_seconds),
      tone: "warning",
    };
  }
  return {
    value: metric.value !== null && metric.value !== undefined ? formatter(metric.value) : "N/D",
    helper: ageLabel(metric.age_seconds) || "Dato corrente",
    tone: "success",
  };
};

function MetricCard({ icon: Icon, label, value, helper, progress, tone = "default" }) {
  const palette = {
    success: { bg: "#ecfdf5", border: "#bbf7d0", fg: "#047857" },
    warning: { bg: "#fff7ed", border: "#fed7aa", fg: "#c2410c" },
    error: { bg: "#fef2f2", border: "#fecaca", fg: "#b91c1c" },
    info: { bg: "#eff6ff", border: "#bfdbfe", fg: "#1d4ed8" },
    default: { bg: "#ffffff", border: "#e2e8f0", fg: "#475569" },
  };
  const current = palette[tone] || palette.default;
  return (
    <Paper variant="outlined" sx={{ p: 1.75, bgcolor: current.bg, borderColor: current.border, minWidth: 0 }}>
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#fff", color: current.fg, flexShrink: 0 }}>
          <Icon size={19} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: .35 }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 950, color: current.fg, lineHeight: 1.15, overflowWrap: "anywhere" }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
          {progress !== null && progress !== undefined ? (
            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} sx={{ mt: 1, height: 6, borderRadius: 4 }} />
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function StatusRow({ label, value, state = "default" }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: .9 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Chip size="small" label={value} color={state} variant={state === "default" ? "outlined" : "filled"} sx={{ fontWeight: 850 }} />
    </Stack>
  );
}

export default function HealthTab({ device, deviceId }) {
  const resolvedDeviceId = deviceId || device?.id || device?.device_id;
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!resolvedDeviceId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/cpe-profiles/devices/${encodeURIComponent(resolvedDeviceId)}/telemetry`, {
        credentials: "same-origin",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
      setTelemetry(body);
    } catch (exc) {
      setError(exc?.message || "Impossibile caricare la telemetria del Device Driver");
    } finally {
      setLoading(false);
    }
  }, [resolvedDeviceId]);

  const refreshRuntime = useCallback(async () => {
    if (!resolvedDeviceId) return;
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/cpe-profiles/devices/${encodeURIComponent(resolvedDeviceId)}/telemetry/refresh`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || `HTTP ${response.status}`);
      setTelemetry(body.telemetry || body);
    } catch (exc) {
      setError(exc?.message || "Refresh runtime fallito");
    } finally {
      setRefreshing(false);
    }
  }, [resolvedDeviceId]);

  useEffect(() => { load(); }, [load]);

  const metrics = telemetry?.metrics || {};
  const health = telemetry?.health || {};
  const systemUptime = metricLabel(metrics["system.uptime_seconds"], formatDuration);
  const cpu = metricLabel(metrics["system.cpu_usage_percent"], (v) => `${Math.round(Number(v))}%`);
  const memory = metricLabel(metrics["system.memory_used_percent"], (v) => `${Math.round(Number(v))}%`);
  const pppStatus = metricLabel(metrics["wan.ppp.status"]);
  const pppUptime = metricLabel(metrics["wan.ppp.uptime_seconds"], formatDuration);

  const insights = useMemo(() => {
    if (!telemetry) return [];
    const items = [];
    if (health.status === "GOOD") {
      items.push({ severity: "success", text: `Stato generale GOOD con confidenza ${health.confidence || "N/D"}.` });
    }
    if (metrics["system.cpu_usage_percent"]?.status === "UNSUPPORTED") {
      items.push({ severity: "info", text: "La CPU non è esposta dal firmware qualificato e non penalizza l'Health score." });
    }
    if (metrics["system.memory_used_percent"]?.status === "UNSUPPORTED") {
      items.push({ severity: "info", text: "La memoria non è esposta dal firmware qualificato e non penalizza l'Health score." });
    }
    if (metrics["system.uptime_seconds"]?.status === "STALE") {
      items.push({ severity: "warning", text: "L'uptime CPE è obsoleto: eseguire un refresh runtime prima di interpretarlo." });
    }
    if (metrics["wan.ppp.status"]?.status === "STALE") {
      items.push({ severity: "warning", text: "Lo stato PPP non è abbastanza recente per essere considerato affidabile." });
    }
    return items;
  }, [telemetry, health, metrics]);

  if (loading && !telemetry) {
    return <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Device Driver Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Metriche normalizzate e policy di freschezza del driver {telemetry?.driver?.product_class || "CPE"}.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} /> : <IconRefresh size={17} />}
          onClick={refreshRuntime}
          disabled={refreshing || !resolvedDeviceId}
        >
          Aggiorna dati runtime
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(5,minmax(0,1fr))" }, gap: 1.25 }}>
        <MetricCard icon={IconActivityHeartbeat} label="Health score" value={health.score !== undefined ? `${health.score}/100` : "N/D"} helper={`Confidenza ${health.confidence || "N/D"}`} progress={health.score} tone={health.status === "GOOD" ? "success" : health.status === "WARNING" ? "warning" : "error"} />
        <MetricCard icon={IconCpu} label="CPU" {...cpu} />
        <MetricCard icon={IconDatabase} label="Memoria usata" {...memory} />
        <MetricCard icon={IconClock} label="Uptime CPE" {...systemUptime} />
        <MetricCard icon={IconPlugConnected} label="PPP" value={pppStatus.value} helper={pppUptime.value !== "N/D" ? `Uptime ${pppUptime.value} · ${pppUptime.helper}` : pppStatus.helper} tone={pppStatus.tone} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1.4fr) minmax(320px,.8fr)" }, gap: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconServer size={19} />
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Stato operativo normalizzato</Typography>
          </Stack>
          <Divider sx={{ my: 1.25 }} />
          <StatusRow label="Stato generale" value={health.status || "N/D"} state={health.status === "GOOD" ? "success" : health.status === "CRITICAL" ? "error" : "warning"} />
          <Divider />
          <StatusRow label="Rischio" value={health.risk_level || "N/D"} state={health.risk_level === "LOW" ? "success" : health.risk_level === "HIGH" ? "error" : "warning"} />
          <Divider />
          <StatusRow label="Confidenza Health" value={health.confidence || "N/D"} />
          <Divider />
          <StatusRow label="Metriche considerate" value={String((health.considered_metrics || []).length)} />
          <Divider />
          <StatusRow label="Metriche escluse" value={String((health.excluded_metrics || []).length)} />
          <Divider />
          <StatusRow label="Refresh richiesto" value={telemetry?.refresh?.required ? "SÌ" : "NO"} state={telemetry?.refresh?.required ? "warning" : "success"} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconAlertTriangle size={19} />
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Health Insight</Typography>
          </Stack>
          <Divider sx={{ my: 1.25 }} />
          <Stack spacing={1}>
            {insights.length ? insights.map((item, index) => (
              <Alert key={`${item.severity}-${index}`} severity={item.severity} variant="outlined">
                {item.text}
              </Alert>
            )) : <Alert severity="info" variant="outlined">Nessun insight disponibile.</Alert>}
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
