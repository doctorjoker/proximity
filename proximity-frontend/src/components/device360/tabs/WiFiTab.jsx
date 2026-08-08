// EUREKA34.7.2_WIFI_WORKSPACE_DATA_ALIGNMENT_UX_CLEANUP
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) return String(value._value);
    return fallback;
  }
  return String(value);
};

const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) value = value._value;
    else return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

const getHealthTone = (score) => {
  const n = safeNumber(score, null);
  if (n === null) return { fg: "#64748b" };
  if (n >= 80) return { fg: "#059669" };
  if (n >= 60) return { fg: "#d97706" };
  return { fg: "#dc2626" };
};

const getRssi = (client) => safeNumber(firstValue(
  client?.rssi,
  client?.signal_strength,
  client?.signal,
  client?.signal_level,
  client?.wifi_rssi,
), null);

const getBand = (client) => {
  const raw = safeText(firstValue(
    client?.band,
    client?.frequency_band,
    client?.radio_band,
    client?.interface_band,
    client?.radio,
  ), "N/D").toLowerCase();
  if (raw.includes("5")) return "5 GHz";
  if (raw.includes("2.4") || raw.includes("2g") || raw.includes("24")) return "2.4 GHz";
  return raw === "n/d" ? "N/D" : safeText(firstValue(client?.band, client?.frequency_band, client?.radio_band, client?.radio));
};

const getRate = (client) => safeNumber(firstValue(
  client?.phy_rate,
  client?.phy_rate_mbps,
  client?.rate,
  client?.current_rate,
  client?.rx_rate,
  client?.tx_rate,
), null);

const qualityFromRssi = (rssi) => {
  if (rssi === null) return { label: "N/D", color: "default" };
  if (rssi >= -55) return { label: "Eccellente", color: "success" };
  if (rssi >= -67) return { label: "Buono", color: "success" };
  if (rssi >= -75) return { label: "Discreto", color: "warning" };
  return { label: "Debole", color: "error" };
};

const formatRate = (value) => value === null ? "N/D" : `${Math.round(value)} Mbps`;

const SoftCard = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 4,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.92)",
      boxShadow: "none",
      ...sx,
    }}
  >
    {children}
  </Card>
);

const Kpi = ({ label, value, helper }) => (
  <SoftCard>
    <CardContent sx={{ p: 2 }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={950}>{value}</Typography>
      {helper ? <Typography variant="caption" sx={{ color: "#94a3b8" }}>{helper}</Typography> : null}
    </CardContent>
  </SoftCard>
);

const emptyBandForm = () => ({
  ssid: "",
  password: "",
  enabled: "",
  channel: "",
  auto_channel: "",
  bandwidth: "",
});

function BandConfigurationCard({
  band,
  deviceId,
  capabilityState,
  initialSsid,
  initialPassword,
  initialEnabled,
  initialChannel,
  initialAutoChannel,
  initialBandwidth,
  onApplied,
  showCapabilityBanner = false,
}) {
  const [form, setForm] = useState(() => ({
    ...emptyBandForm(),
    ssid: initialSsid || "",
    password: initialPassword || "",
    enabled: initialEnabled === null || initialEnabled === undefined ? "" : String(Boolean(initialEnabled)),
    channel: initialChannel === null || initialChannel === undefined ? "" : String(initialChannel),
    auto_channel: initialAutoChannel === null || initialAutoChannel === undefined ? "" : String(Boolean(initialAutoChannel)),
    bandwidth: initialBandwidth || "",
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      ssid: initialSsid || "",
      enabled: initialEnabled === null || initialEnabled === undefined ? "" : String(Boolean(initialEnabled)),
      channel: initialChannel === null || initialChannel === undefined ? "" : String(initialChannel),
      auto_channel: initialAutoChannel === null || initialAutoChannel === undefined ? "" : String(Boolean(initialAutoChannel)),
      bandwidth: initialBandwidth || "",
    }));
  }, [initialSsid, initialEnabled, initialChannel, initialAutoChannel, initialBandwidth]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setResult(null);
    setError("");
  };

  const buildPayload = () => {
    const payload = { band };
    if (form.ssid.trim()) payload.ssid = form.ssid.trim();
    if (form.password) payload.password = form.password;
    if (form.enabled !== "") payload.enabled = form.enabled === "true";
    if (form.channel !== "") payload.channel = Number(form.channel);
    if (form.auto_channel !== "") payload.auto_channel = form.auto_channel === "true";
    if (form.bandwidth.trim()) payload.bandwidth = form.bandwidth.trim();
    return payload;
  };

  const apply = async () => {
    setError("");
    setResult(null);
    if (!deviceId) {
      setError("Identificativo dispositivo non disponibile nella tab Device360.");
      return;
    }
    const payload = buildPayload();
    if (Object.keys(payload).length === 1) {
      setError("Compila almeno un parametro da modificare.");
      return;
    }
    if (payload.password && (payload.password.length < 8 || payload.password.length > 63)) {
      setError("La password WiFi deve contenere da 8 a 63 caratteri.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/devices/${deviceId}/wifi/configuration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
        throw new Error(detail || `Errore HTTP ${response.status}`);
      }
      setResult(body);
      setForm((current) => ({ ...current, password: "" }));
      onApplied?.(body);
    } catch (exc) {
      setError(exc?.message || "Configurazione WiFi non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SoftCard sx={{ height: "100%" }}>
      {/* EUREKA34_WIFI_CAPABILITY_BANNER */}
      {showCapabilityBanner && capabilityState?.get?.('wifi.scan.execute') ? (
        <Alert severity={capabilityState.supports('wifi.scan.results_exported') ? 'success' : 'info'} variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
          Scansione WiFi {capabilityState.supports('wifi.scan.execute') ? 'supportata' : 'non supportata'}.
          {!capabilityState.supports('wifi.scan.results_exported') && capabilityState.isQualified('wifi.scan.results_exported')
            ? ` ${capabilityState.reason('wifi.scan.results_exported') || 'Il CPE non esporta le reti vicine via ACS.'}`
            : ''}
        </Alert>
      ) : null}

      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" fontWeight={950}>Rete {band}</Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Configurazione profile-driven tramite GenieACS.
            </Typography>
          </Box>
          <Chip label={band} color={band === "5GHz" ? "secondary" : "primary"} sx={{ fontWeight: 900 }} />
        </Stack>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <TextField fullWidth size="small" label="SSID" value={form.ssid} onChange={update("ssid")} />
          <TextField
            fullWidth
            size="small"
            type={showPassword ? "text" : "password"}
            label="Nuova password"
            value={form.password}
            onChange={update("password")}
            helperText="8-63 caratteri. Lascia vuoto per non modificarla."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((value) => !value)} edge="end" size="small">
                    {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Radio</InputLabel>
              <Select label="Radio" value={form.enabled} onChange={update("enabled")}>
                <MenuItem value="">Non modificare</MenuItem>
                <MenuItem value="true">Attiva</MenuItem>
                <MenuItem value="false">Disattiva</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Auto channel</InputLabel>
              <Select label="Auto channel" value={form.auto_channel} onChange={update("auto_channel")}>
                <MenuItem value="">Non modificare</MenuItem>
                <MenuItem value="true">Attiva</MenuItem>
                <MenuItem value="false">Disattiva</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Canale"
              value={form.channel}
              onChange={update("channel")}
              inputProps={{ min: 1 }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Bandwidth</InputLabel>
              <Select label="Bandwidth" value={form.bandwidth} onChange={update("bandwidth")}>
                <MenuItem value="">Non modificare</MenuItem>
                <MenuItem value="20MHz">20 MHz</MenuItem>
                <MenuItem value="40MHz">40 MHz</MenuItem>
                {band === "5GHz" ? <MenuItem value="80MHz">80 MHz</MenuItem> : null}
              </Select>
            </FormControl>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {result ? (
            <Alert severity="success">
              Task ACS creato. Campi: {(result.updated_fields || []).join(", ") || "configurazione"}.
            </Alert>
          ) : null}

          <Button
            variant="contained"
            onClick={apply}
            disabled={loading}
            sx={{ alignSelf: "flex-start", borderRadius: 999, fontWeight: 900, px: 2.5 }}
          >
            {loading ? <><CircularProgress size={17} sx={{ mr: 1 }} />Applicazione...</> : `Applica ${band}`}
          </Button>
        </Stack>
      </CardContent>
    </SoftCard>
  );
}


const diagnosticStatusLabel = (status) => {
  const labels = {
    CREATED: "Richiesta creata",
    QUEUED: "In coda",
    REQUESTED: "Richiesta inviata al router",
    RUNNING: "Scansione WiFi in corso",
    COLLECTING: "Raccolta risultati",
    COMPLETED: "Scansione completata",
    FAILED: "Scansione non riuscita",
    TIMED_OUT: "Tempo massimo superato",
    CANCELLED: "Scansione annullata",
  };
  return labels[status] || status || "Non avviata";
};

const formatDiagnosticDate = (value) => {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("it-IT");
};

const diagnosticDuration = (job) => {
  const started = job?.started_at ? new Date(job.started_at).getTime() : null;
  const completed = job?.completed_at ? new Date(job.completed_at).getTime() : Date.now();
  if (!started || Number.isNaN(started) || Number.isNaN(completed)) return null;
  return Math.max(0, Math.round((completed - started) / 1000));
};

export default function WiFiTab({
  deviceId,
  device,
  wifiQuality,
  diagnostics,
  clients,
  wifi,
  newSSID,
  newWifiPassword,
  wifiScanLoading,
  wifiOptimizeLoading,
  onWifiOptimize,
  onWifiScan: _legacyOnWifiScan,
  onRefresh,
}) {
  const capabilityState = useDeviceCapabilities(deviceId || device?.id || device?.device_id);

  const [orderBy, setOrderBy] = useState("rssi");
  const [order, setOrder] = useState("desc");
  const [lastTask, setLastTask] = useState(null);
  const [scanJob, setScanJob] = useState(null);
  const [scanJobLoading, setScanJobLoading] = useState(false);
  const [scanJobError, setScanJobError] = useState("");

  const resolvedDeviceId = firstValue(
    deviceId,
    device?.id,
    diagnostics?.device_id,
    diagnostics?.id,
    wifiQuality?.device_id,
    clients?.device_id,
  );

  const wifiPayload = wifi?.wifi || wifi || {};
  const wifiSsids = Array.isArray(wifiPayload?.ssids) ? wifiPayload.ssids : [];
  const wifiRadios = Array.isArray(wifiPayload?.radios) ? wifiPayload.radios : [];

  const normalizeBand = (value) => String(value || "").replace(/\s+/g, "").toLowerCase();
  const findBandItem = (items, band) => items.find((item) => normalizeBand(item?.band) === normalizeBand(band));

  const ssid24 = findBandItem(wifiSsids, "2.4GHz");
  const ssid5 = findBandItem(wifiSsids, "5GHz");
  const radio24 = findBandItem(wifiRadios, "2.4GHz") || wifiPayload?.radio_24 || {};
  const radio5 = findBandItem(wifiRadios, "5GHz") || wifiPayload?.radio_5 || {};

  const band24Configuration = {
    ssid: firstValue(ssid24?.ssid, wifiPayload?.primary?.band === "2.4GHz" ? wifiPayload?.primary?.ssid : null, newSSID),
    enabled: firstValue(ssid24?.enabled, radio24?.enabled),
    channel: radio24?.channel,
    autoChannel: radio24?.auto_channel,
    bandwidth: radio24?.bandwidth,
  };

  const band5Configuration = {
    ssid: firstValue(ssid5?.ssid, wifiPayload?.primary?.band === "5GHz" ? wifiPayload?.primary?.ssid : null),
    enabled: firstValue(ssid5?.enabled, radio5?.enabled),
    channel: radio5?.channel,
    autoChannel: radio5?.auto_channel,
    bandwidth: radio5?.bandwidth,
  };

  const normalizedClients = useMemo(() => {
    const source = Array.isArray(clients?.clients) ? clients.clients : [];
    return source.map((client, index) => ({
      key: client?.host_id || client?.mac_address || client?.mac || `wifi-client-${index}`,
      hostname: safeText(firstValue(client?.hostname, client?.host_name, client?.name), "Dispositivo"),
      vendor: safeText(firstValue(client?.vendor, client?.manufacturer, client?.oui_vendor)),
      ip: safeText(firstValue(client?.ip_address, client?.ip, client?.ipv4_address)),
      mac: safeText(firstValue(client?.mac_address, client?.mac, client?.phys_address)),
      band: getBand(client),
      rssi: getRssi(client),
      rate: getRate(client),
      active: client?.active !== false && client?.online !== false,
      connectedSince: safeText(firstValue(client?.connected_since, client?.association_time, client?.uptime, client?.lease_time_remaining)),
    }));
  }, [clients]);

  const sortedClients = useMemo(() => {
    const result = [...normalizedClients];
    result.sort((a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av === null || av === "N/D") return 1;
      if (bv === null || bv === "N/D") return -1;
      const comparison = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv), "it", { sensitivity: "base" });
      return order === "asc" ? comparison : -comparison;
    });
    return result;
  }, [normalizedClients, order, orderBy]);

  const activeClients = normalizedClients.filter((client) => client.active);
  const band5Count = activeClients.filter((client) => client.band === "5 GHz").length;
  const band24Count = activeClients.filter((client) => client.band === "2.4 GHz").length;
  const rssiValues = activeClients.map((client) => client.rssi).filter((value) => value !== null);
  const averageRssi = rssiValues.length ? Math.round(rssiValues.reduce((sum, value) => sum + value, 0) / rssiValues.length) : null;

  const requestSort = (field) => {
    if (orderBy === field) setOrder((value) => value === "asc" ? "desc" : "asc");
    else { setOrderBy(field); setOrder("asc"); }
  };

  const handleApplied = (result) => {
    setLastTask(result);
    window.setTimeout(() => onRefresh?.(), 1500);
  };

  const runWifiScanJob = async () => {
    if (!resolvedDeviceId || scanJobLoading) return;

    setScanJobLoading(true);
    setScanJobError("");
    setScanJob({ status: "CREATED", progress: 0 });

    try {
      const createResponse = await fetch("/api/v1/device-diagnostics/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: resolvedDeviceId,
          diagnostic_type: "WIFI_SCAN",
          timeout_seconds: 45,
          parameters: { poll_seconds: 5, source: "DEVICE360_WIFI_TAB" },
        }),
      });
      const createBody = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        const detail = typeof createBody?.detail === "string" ? createBody.detail : createBody?.detail?.message;
        throw new Error(detail || `Creazione job fallita (HTTP ${createResponse.status})`);
      }

      const jobId = createBody?.job?.id;
      if (!jobId) throw new Error("Il Diagnostics Engine non ha restituito il job ID.");

      setScanJob(createBody.job);
      const terminalStates = new Set(["COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"]);

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        const response = await fetch(`/api/v1/device-diagnostics/jobs/${jobId}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
          throw new Error(detail || `Lettura job fallita (HTTP ${response.status})`);
        }

        const job = body?.job || {};
        setScanJob(job);
        if (terminalStates.has(job.status)) {
          if (job.status === "FAILED" || job.status === "TIMED_OUT") {
            const message = job?.error?.message || job?.result?.message || `WiFi Scan terminato con stato ${job.status}.`;
            setScanJobError(message);
          }
          return;
        }
      }

      throw new Error("Polling WiFi Scan terminato senza uno stato finale.");
    } catch (error) {
      setScanJobError(error?.message || "WiFi Scan non riuscito.");
      setScanJob((current) => ({ ...(current || {}), status: "FAILED", progress: current?.progress || 0 }));
    } finally {
      setScanJobLoading(false);
    }
  };

  const scanStatus = scanJob?.status;
  const scanResult = scanJob?.result || {};
  const scanCapability = scanResult?.capability_status;
  const scanNeighborCount = Number(scanResult?.neighbor_count || 0);
  const scanInProgress = scanJobLoading || ["CREATED", "QUEUED", "REQUESTED", "RUNNING", "COLLECTING"].includes(scanStatus);
  const scanStatusLabel = {
    CREATED: "Creazione job",
    QUEUED: "In coda",
    REQUESTED: "Richiesta inviata al CPE",
    RUNNING: "Diagnostica in corso",
    COLLECTING: "Raccolta risultati",
    COMPLETED: "Completata",
    FAILED: "Fallita",
    TIMED_OUT: "Tempo scaduto",
    CANCELLED: "Annullata",
  }[scanStatus] || "Pronta";

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
        <Kpi label="Client connessi" value={activeClients.length || clients?.active_count || clients?.count || 0} helper={`${normalizedClients.length} rilevati`} />
        <Kpi label="Client 5 GHz" value={band5Count} helper="Banda ad alte prestazioni" />
        <Kpi label="Client 2.4 GHz" value={band24Count} helper="Banda a maggiore copertura" />
        <Kpi label="RSSI medio" value={averageRssi === null ? "N/D" : `${averageRssi} dBm`} helper={qualityFromRssi(averageRssi).label} />
      </Box>

      <SoftCard>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
            <Box>
              <Typography variant="h6" fontWeight={950}>WiFi Operations</Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>Configurazione e assurance nello stesso workspace Device360.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button variant="contained" onClick={onWifiOptimize} disabled={wifiOptimizeLoading} sx={{ borderRadius: 999, fontWeight: 900 }}>
                {wifiOptimizeLoading ? "Ottimizzazione..." : "Ottimizza WiFi"}
              </Button>
              <Button variant="outlined" onClick={runWifiScanJob} disabled={scanInProgress || !resolvedDeviceId} sx={{ borderRadius: 999, fontWeight: 900 }}>
                {scanInProgress ? scanStatusLabel : "WiFi Scan"}
              </Button>
              <Button variant="outlined" onClick={onRefresh} sx={{ borderRadius: 999, fontWeight: 900 }}>Aggiorna</Button>
            </Stack>
          </Stack>
          {(scanInProgress || wifiOptimizeLoading) && <LinearProgress variant="indeterminate" sx={{ mt: 2, borderRadius: 999 }} />}
          {!resolvedDeviceId ? <Alert severity="warning" sx={{ mt: 2 }}>La tab non ha ricevuto il device ID. La configurazione resta disabilitata finché Device360 non espone l'identificativo.</Alert> : null}
          {scanJobError ? <Alert severity="error" sx={{ mt: 2 }}>{scanJobError}</Alert> : null}

          {scanInProgress ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography fontWeight={950}>{diagnosticStatusLabel(scanStatus)}</Typography>
              <Typography variant="body2">
                La richiesta è gestita dal Diagnostics Engine. Attendere il completamento senza aggiornare manualmente la pagina.
              </Typography>
            </Alert>
          ) : null}

          {scanStatus === "COMPLETED" ? (
            <Alert severity={Number(scanResult?.neighbor_count || 0) > 0 ? "success" : "warning"} sx={{ mt: 2 }}>
              <Typography fontWeight={950}>Scansione WiFi completata</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {Number(scanResult?.neighbor_count || 0) > 0
                  ? `${scanResult.neighbor_count} reti WiFi vicine restituite dal CPE.`
                  : "La scansione è stata eseguita su entrambe le bande, ma il CPE non ha restituito reti WiFi vicine tramite ACS."}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.75 }}>
                Esito tecnico: {scanCapability || "COMPLETED"}
              </Typography>
            </Alert>
          ) : null}

          {["FAILED", "TIMED_OUT", "CANCELLED"].includes(scanStatus) ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography fontWeight={950}>{diagnosticStatusLabel(scanStatus)}</Typography>
              <Typography variant="body2">
                {scanJob?.error?.message || scanJob?.result?.message || "La diagnostica non è stata completata."}
              </Typography>
            </Alert>
          ) : null}

          {scanJob?.id ? (
            <Accordion disableGutters elevation={0} sx={{ mt: 2, border: "1px solid rgba(15,23,42,0.08)", borderRadius: 2, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<span style={{ fontSize: 18 }}>⌄</span>}>
                <Typography fontWeight={900}>Dettagli diagnostica</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
                  <Typography variant="body2"><strong>Job ID:</strong> {scanJob.id}</Typography>
                  <Typography variant="body2"><strong>Stato:</strong> {diagnosticStatusLabel(scanStatus)}</Typography>
                  <Typography variant="body2"><strong>Avviata:</strong> {formatDiagnosticDate(scanJob.started_at || scanJob.created_at)}</Typography>
                  <Typography variant="body2"><strong>Completata:</strong> {formatDiagnosticDate(scanJob.completed_at)}</Typography>
                  <Typography variant="body2"><strong>Durata:</strong> {diagnosticDuration(scanJob) === null ? "N/D" : `${diagnosticDuration(scanJob)} s`}</Typography>
                  <Typography variant="body2"><strong>Reti restituite:</strong> {scanResult?.neighbor_count ?? 0}</Typography>
                </Box>

                {Array.isArray(scanResult?.bands) && scanResult.bands.length > 0 ? (
                  <Stack spacing={1.25} sx={{ mt: 2 }}>
                    {scanResult.bands.map((item) => (
                      <Box key={item.band || item.trigger_path} sx={{ p: 1.5, borderRadius: 2, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography fontWeight={950}>{item.band || "Banda WiFi"}</Typography>
                          <Chip size="small" label={`${item.result_count ?? 0} reti`} sx={{ fontWeight: 800 }} />
                        </Stack>
                        <Typography variant="caption" sx={{ display: "block", mt: 0.75, wordBreak: "break-all" }}>
                          Trigger: {item.trigger_path || "N/D"} = {item.trigger_value || "N/D"}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", wordBreak: "break-all" }}>
                          Risultati: {item.results_path || "N/D"}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : null}
              </AccordionDetails>
            </Accordion>
          ) : null}
        </CardContent>
      </SoftCard>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
        <BandConfigurationCard
          showCapabilityBanner

          band="2.4GHz"
          deviceId={resolvedDeviceId}
          capabilityState={capabilityState}
          initialSsid={band24Configuration.ssid}
          initialPassword={newWifiPassword}
          initialEnabled={band24Configuration.enabled}
          initialChannel={band24Configuration.channel}
          initialAutoChannel={band24Configuration.autoChannel}
          initialBandwidth={band24Configuration.bandwidth}
          onApplied={handleApplied}
        />
        <BandConfigurationCard
          band="5GHz"
          deviceId={resolvedDeviceId}
          capabilityState={capabilityState}
          initialSsid={band5Configuration.ssid}
          initialEnabled={band5Configuration.enabled}
          initialChannel={band5Configuration.channel}
          initialAutoChannel={band5Configuration.autoChannel}
          initialBandwidth={band5Configuration.bandwidth}
          onApplied={handleApplied}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr 0.6fr" }, gap: 2 }}>
        <SoftCard>
          <CardContent>
            <Typography variant="h6" fontWeight={950}>Client Intelligence</Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>Inventario operativo dei client wireless rilevati dal CPE.</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3 }}>
              <Table size="small" sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow sx={{ background: "#f8fafc" }}>
                    {[["hostname","Dispositivo"],["vendor","Vendor"],["ip","IP"],["mac","MAC"],["band","Banda"],["rssi","RSSI"],["rate","PHY Rate"]].map(([field, label]) => (
                      <TableCell key={field} sx={{ fontWeight: 950 }}><TableSortLabel active={orderBy === field} direction={orderBy === field ? order : "asc"} onClick={() => requestSort(field)}>{label}</TableSortLabel></TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 950 }}>Qualità</TableCell>
                    <TableCell sx={{ fontWeight: 950 }}>Stato</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedClients.map((client) => {
                    const quality = qualityFromRssi(client.rssi);
                    return (
                      <TableRow key={client.key} hover>
                        <TableCell><Typography fontWeight={900}>{client.hostname}</Typography><Typography variant="caption" sx={{ color: "#64748b" }}>{client.connectedSince}</Typography></TableCell>
                        <TableCell>{client.vendor}</TableCell><TableCell>{client.ip}</TableCell><TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{client.mac}</TableCell>
                        <TableCell><Chip size="small" label={client.band} sx={{ fontWeight: 800 }} /></TableCell><TableCell>{client.rssi === null ? "N/D" : `${client.rssi} dBm`}</TableCell><TableCell>{formatRate(client.rate)}</TableCell>
                        <TableCell><Chip size="small" label={quality.label} color={quality.color} variant="outlined" sx={{ fontWeight: 800 }} /></TableCell>
                        <TableCell><Chip size="small" label={client.active ? "Online" : "Inattivo"} color={client.active ? "success" : "default"} sx={{ fontWeight: 800 }} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {sortedClients.length === 0 ? <TableRow><TableCell colSpan={9}><Box sx={{ p: 4, textAlign: "center", color: "#64748b" }}>Nessun client WiFi rilevato.</Box></TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </SoftCard>

        <SoftCard>
          <CardContent>
            <Typography variant="h6" fontWeight={950}>Esperienza WiFi</Typography>
            {wifiQuality ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="h3" fontWeight={950} sx={{ color: getHealthTone(wifiQuality.score).fg }}>{wifiQuality.score ?? "N/D"}/100</Typography>
                <Typography fontWeight={900}>{wifiQuality.rating || "N/D"}</Typography>
                <Typography sx={{ mt: 1, fontSize: 22 }}>{"★".repeat(wifiQuality.stars || 0)}{"☆".repeat(Math.max(0, 5 - (wifiQuality.stars || 0)))}</Typography>
                <Divider sx={{ my: 2 }} />
                {(wifiQuality.issues || []).slice(0, 5).map((item, index) => <Typography key={index} variant="body2" sx={{ mb: 1 }}>• {safeText(item?.message || item)}</Typography>)}
              </Box>
            ) : <Typography sx={{ mt: 2, color: "#64748b" }}>Dati esperienza WiFi non disponibili.</Typography>}
          </CardContent>
        </SoftCard>
      </Box>
    </Stack>
  );
}
