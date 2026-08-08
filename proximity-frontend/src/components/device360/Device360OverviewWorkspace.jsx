import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconArrowRight,
  IconCertificate,
  IconCheck,
  IconClock,
  IconCloudNetwork,
  IconCpu,
  IconHistory,
  IconRefresh,
  IconRouter,
  IconServer,
  IconShieldCheck,
  IconUsers,
  IconWifi,
  IconWorld,
  IconPhoto,
} from "@tabler/icons-react";

import { useDevice360SharedState } from "./Device360SharedState";
import { useDeviceImage } from "./deviceImageCatalog";

const RELEASE = "EUREKA34.9.0";

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

const unwrap = (value) => {
  if (value && typeof value === "object" && value._value !== undefined) return value._value;
  return value;
};

const safeText = (value, fallback = "N/D") => {
  const unwrapped = unwrap(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === "") return fallback;
  return String(unwrapped);
};

const safeNumber = (value, fallback = null) => {
  const parsed = Number(unwrap(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolValue = (value, fallback = null) => {
  const raw = unwrap(value);
  if (typeof raw === "boolean") return raw;
  const normalized = String(raw ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "enabled", "active", "up", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "disabled", "inactive", "down", "off"].includes(normalized)) return false;
  return fallback;
};

const formatDateTime = (value) => {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("it-IT");
};

const formatDuration = (seconds) => {
  const value = safeNumber(seconds, null);
  if (value === null) return "N/D";
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};


function DeviceVisualHero({ device, overview, diagnostics, qualification, onNavigate }) {
  const [imageFailed, setImageFailed] = useState(false);
  const manufacturer = safeText(firstValue(overview?.manufacturer, device?.manufacturer), "Vendor N/D");
  const model = safeText(firstValue(overview?.model, device?.model, overview?.product_class, device?.product_class), "Modello N/D");
  const productClass = safeText(firstValue(overview?.product_class, device?.product_class), "N/D");
  const firmware = safeText(firstValue(overview?.software_version, device?.software_version), "N/D");
  const hardware = safeText(firstValue(overview?.hardware_version, device?.hardware_version), "N/D");
  const serial = safeText(firstValue(overview?.serial_number, device?.serial_number, device?.serial), "N/D");
  const score = safeNumber(qualification?.score?.score, null);
  const online = Boolean(firstValue(
    overview?.online,
    String(overview?.presence_state || "").toUpperCase() === "ONLINE",
    String(overview?.status || "").toUpperCase() === "ONLINE",
  ));
  const uptime = formatDuration(firstValue(diagnostics?.uptime_seconds, overview?.uptime_seconds));
  const explicitImage = firstValue(overview?.device_image, overview?.image, device?.device_image, device?.image);
  const image = useDeviceImage({ manufacturer, model, productClass, explicitImage });

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderRadius: 2.5,
        background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 52%, #f0f7ff 100%)",
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px minmax(0,1fr)" }, minHeight: 270 }}>
        <Box
          sx={{
            p: 2.5,
            display: "grid",
            placeItems: "center",
            position: "relative",
            background: "radial-gradient(circle at 50% 45%, rgba(37,99,235,.12), rgba(255,255,255,.8) 58%, rgba(226,232,240,.8) 100%)",
            borderRight: { md: "1px solid" },
            borderColor: { md: "divider" },
          }}
        >
          {!imageFailed && image?.src ? (
            <Box
              component="img"
              src={image.src}
              alt={`${manufacturer} ${model}`}
              onError={() => setImageFailed(true)}
              sx={{ width: "100%", maxWidth: 250, height: 205, objectFit: "contain", filter: "drop-shadow(0 16px 20px rgba(15,23,42,.18))" }}
            />
          ) : (
            <Stack alignItems="center" spacing={1} color="text.secondary">
              <IconPhoto size={58} stroke={1.2} />
              <Typography variant="body2" sx={{ fontWeight: 800 }}>Immagine dispositivo non catalogata</Typography>
              <Typography variant="caption">Aggiungere l'asset in public/devices</Typography>
            </Stack>
          )}
          <Chip
            size="small"
            label={image?.source === "catalog" || explicitImage ? "CPE Image Catalog" : "Asset fallback"}
            variant="outlined"
            sx={{ position: "absolute", left: 14, bottom: 12, bgcolor: "rgba(255,255,255,.84)", fontWeight: 800 }}
          />
        </Box>

        <Box sx={{ p: { xs: 2, md: 2.75 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 950, letterSpacing: 1 }}>Device identity</Typography>
                <Chip size="small" color={online ? "success" : "error"} label={online ? "ONLINE" : "OFFLINE"} sx={{ fontWeight: 900 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.25, letterSpacing: -0.6 }}>{manufacturer} {model}</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>Gateway CPE · ProductClass {productClass}</Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography variant="caption" color="text.secondary">Qualification</Typography>
              <Typography variant="h5" color={score !== null && score >= 60 ? "success.main" : "text.primary"} sx={{ fontWeight: 950 }}>{score === null ? "N/D" : `${score}/100`}</Typography>
              <Typography variant="caption" color="text.secondary">{safeText(qualification?.qualification_status, "Non qualificato")}</Typography>
            </Box>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" }, gap: 1, mt: 2.25 }}>
            {[
              ["Firmware", firmware],
              ["Hardware", hardware],
              ["Seriale", serial],
              ["Uptime", uptime],
            ].map(([label, value]) => (
              <Box key={label} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "rgba(255,255,255,.84)", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.25 }}>
            <Button variant="contained" startIcon={<IconWifi size={16} />} onClick={() => onNavigate?.("wifi")}>Apri WiFi Operations</Button>
            <Button variant="outlined" startIcon={<IconShieldCheck size={16} />} onClick={() => onNavigate?.("diagnostics")}>Esegui diagnostica</Button>
            <Button variant="text" endIcon={<IconArrowRight size={15} />} onClick={() => onNavigate?.("qualification")}>Dettagli qualification</Button>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}

function StatusNode({ icon: Icon, label, value, detail, status = "neutral" }) {
  const palette = {
    success: { bg: "#ecfdf5", border: "#bbf7d0", fg: "#047857", dot: "#22c55e" },
    warning: { bg: "#fff7ed", border: "#fed7aa", fg: "#c2410c", dot: "#f59e0b" },
    error: { bg: "#fef2f2", border: "#fecaca", fg: "#b91c1c", dot: "#ef4444" },
    neutral: { bg: "#f8fafc", border: "#e2e8f0", fg: "#475569", dot: "#94a3b8" },
  };
  const tone = palette[status] || palette.neutral;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: tone.bg,
        borderColor: tone.border,
        borderRadius: 2,
        minWidth: 0,
        position: "relative",
      }}
    >
      <Box sx={{ position: "absolute", top: 12, right: 12, width: 9, height: 9, borderRadius: "50%", bgcolor: tone.dot }} />
      <Stack direction="row" spacing={1.1} alignItems="center">
        <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.78)", color: tone.fg }}>
          <Icon size={18} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 950, color: tone.fg, lineHeight: 1.15, overflowWrap: "anywhere" }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{detail}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function SectionCard({ title, icon: Icon, action, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, bgcolor: "background.paper", ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 32, height: 32, borderRadius: 1.25, bgcolor: "rgba(25,118,210,.08)", color: "primary.main", display: "grid", placeItems: "center" }}>
            <Icon size={17} />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>{title}</Typography>
        </Stack>
        {action}
      </Stack>
      <Divider sx={{ mb: 1.25 }} />
      {children}
    </Paper>
  );
}

function ServiceHealthMap({ overview, diagnostics, wifi, clients, qualification }) {
  const wifiPayload = wifi?.wifi || wifi || {};
  const radios = Array.isArray(wifiPayload?.radios) ? wifiPayload.radios : [];
  const online = Boolean(firstValue(
    overview?.online,
    String(overview?.presence_state || "").toUpperCase() === "ONLINE",
    String(overview?.status || "").toUpperCase() === "ONLINE",
  ));
  const wanIp = firstValue(diagnostics?.wan_ip, diagnostics?.ip_wan, diagnostics?.ppp?.wan_ip, overview?.wan_ip, overview?.ip_wan);
  const wanState = safeText(firstValue(diagnostics?.ppp_status, diagnostics?.ppp_interface_status, diagnostics?.ppp?.status, overview?.wan_status), wanIp ? "Connected" : "N/D");
  const wanOnline = ["connected", "up", "online", "active"].includes(wanState.toLowerCase()) || Boolean(wanIp);
  const radio24 = radios.find((item) => String(item?.band || item?.frequency_band || "").includes("2.4"));
  const radio5 = radios.find((item) => String(item?.band || item?.frequency_band || "").includes("5"));
  const radio24Enabled = boolValue(firstValue(radio24?.enabled, wifiPayload?.radio_24?.enabled), radios.length ? false : null);
  const radio5Enabled = boolValue(firstValue(radio5?.enabled, wifiPayload?.radio_5?.enabled), radios.length ? false : null);
  const score = safeNumber(qualification?.score?.score, null);

  const nodes = [
    { label: "ACS", value: "Raggiungibile", detail: safeText(overview?.acs_device_id, "Identità primaria"), icon: IconServer, status: online ? "success" : "warning" },
    { label: "CPE", value: online ? "Online" : "Offline", detail: safeText(firstValue(overview?.model, overview?.product_class), "Dispositivo"), icon: IconRouter, status: online ? "success" : "error" },
    { label: "WAN", value: wanOnline ? "Connected" : wanState, detail: wanIp ? `IP ${safeText(wanIp)}` : "IP non disponibile", icon: IconWorld, status: wanOnline ? "success" : "warning" },
    { label: "WiFi 2.4", value: radio24Enabled === true ? "Attiva" : radio24Enabled === false ? "Disattiva" : "N/D", detail: safeText(firstValue(radio24?.ssid, wifiPayload?.primary?.band === "2.4GHz" ? wifiPayload?.primary?.ssid : null), "SSID non disponibile"), icon: IconWifi, status: radio24Enabled === true ? "success" : radio24Enabled === false ? "warning" : "neutral" },
    { label: "WiFi 5", value: radio5Enabled === true ? "Attiva" : radio5Enabled === false ? "Disattiva" : "N/D", detail: safeText(radio5?.ssid, "SSID non disponibile"), icon: IconWifi, status: radio5Enabled === true ? "success" : radio5Enabled === false ? "warning" : "neutral" },
    { label: "Client", value: `${clients.length}`, detail: clients.length === 1 ? "client connesso" : "client connessi", icon: IconUsers, status: clients.length > 0 ? "success" : "neutral" },
    { label: "Qualification", value: score === null ? "N/D" : `${score}/100`, detail: safeText(qualification?.qualification_status, "Profilo non valutato"), icon: IconCertificate, status: score !== null && score >= 60 ? "success" : score !== null ? "warning" : "neutral" },
  ];

  return (
    <SectionCard title="Service Health Map" icon={IconCloudNetwork}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(7,minmax(0,1fr))" }, gap: 1 }}>
        {nodes.map((node) => <StatusNode key={node.label} {...node} />)}
      </Box>
    </SectionCard>
  );
}

function OperationalInsights({ overview, diagnostics, wifi, clients, qualification }) {
  const health = safeNumber(firstValue(diagnostics?.health_score, overview?.health_score), null);
  const wanIp = firstValue(diagnostics?.wan_ip, diagnostics?.ip_wan, diagnostics?.ppp?.wan_ip, overview?.wan_ip);
  const pppStatus = safeText(firstValue(diagnostics?.ppp_status, diagnostics?.ppp_interface_status, diagnostics?.ppp?.status, overview?.wan_status), wanIp ? "Connected" : "N/D");
  const wifiPayload = wifi?.wifi || wifi || {};
  const radios = Array.isArray(wifiPayload?.radios) ? wifiPayload.radios : [];
  const qualificationScore = safeNumber(qualification?.score?.score, null);
  const qualified = safeNumber(qualification?.score?.qualified, null);
  const total = safeNumber(qualification?.score?.total, null);
  const limitations = Array.isArray(qualification?.items)
    ? qualification.items.reduce((sum, item) => sum + (Array.isArray(item?.limitations) ? item.limitations.length : 0), 0)
    : 0;

  const insights = [
    {
      title: "Stato generale",
      text: health !== null && health >= 80 ? `Il dispositivo è operativo con health score ${health}/100.` : "Lo stato generale richiede una verifica operativa.",
      severity: health !== null && health >= 80 ? "success" : "warning",
    },
    {
      title: "Connettività WAN",
      text: String(pppStatus).toLowerCase().includes("connect") || wanIp
        ? `La sessione WAN è attiva${wanIp ? ` con IP ${safeText(wanIp)}` : ""}.`
        : "La sessione WAN non risulta connessa.",
      severity: String(pppStatus).toLowerCase().includes("connect") || wanIp ? "success" : "warning",
    },
    {
      title: "WiFi",
      text: `${radios.length || 2} radio rilevate. ${clients.length ? `${clients.length} client connessi.` : "Nessun client attualmente rilevato."}`,
      severity: clients.length ? "success" : "info",
    },
    {
      title: "Qualification",
      text: qualificationScore === null
        ? "Qualificazione non ancora disponibile."
        : `${qualified ?? 0} capability su ${total ?? 0} qualificate, score ${qualificationScore}/100${limitations ? `, ${limitations} limitazioni note.` : "."}`,
      severity: qualificationScore !== null && qualificationScore >= 60 ? "success" : "info",
    },
  ];

  return (
    <SectionCard title="Operational Insight" icon={IconActivityHeartbeat}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 1 }}>
        {insights.map((item) => (
          <Alert key={item.title} severity={item.severity} variant="outlined" icon={item.severity === "success" ? <IconCheck size={18} /> : undefined}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>{item.title}</Typography>
            <Typography variant="body2">{item.text}</Typography>
          </Alert>
        ))}
      </Box>
    </SectionCard>
  );
}

function RecentActivity({ overview, diagnostics, qualification, history, onNavigate }) {
  const events = useMemo(() => {
    const raw = [];
    const source = Array.isArray(history)
      ? history
      : Array.isArray(overview?.recent_events)
        ? overview.recent_events
        : [];
    source.slice(0, 5).forEach((event) => raw.push({
      time: firstValue(event?.created_at, event?.timestamp, event?.observed_at),
      title: safeText(firstValue(event?.title, event?.event_type, event?.type), "Evento dispositivo"),
      detail: safeText(firstValue(event?.message, event?.description), "Dettaglio non disponibile"),
    }));
    if (!raw.length && overview?.last_seen) raw.push({ time: overview.last_seen, title: "Inform ricevuto", detail: "Il dispositivo ha aggiornato la propria presenza ACS." });
    if (diagnostics?.ppp_last_connect_time) raw.push({ time: diagnostics.ppp_last_connect_time, title: "Sessione WAN attiva", detail: "Connessione PPP verificata." });
    const evidence = Array.isArray(qualification?.items)
      ? qualification.items.flatMap((item) => Array.isArray(item?.evidence) ? item.evidence : [])
      : [];
    evidence.slice(0, 2).forEach((entry) => raw.push({ time: entry?.observed_at, title: safeText(entry?.title, "Evidenza qualification"), detail: safeText(entry?.result, "Esito registrato") }));
    return raw
      .filter((event) => event.title)
      .sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")))
      .slice(0, 6);
  }, [diagnostics, history, overview, qualification]);

  return (
    <SectionCard
      title="Attività recente"
      icon={IconHistory}
      action={<Button size="small" endIcon={<IconArrowRight size={15} />} onClick={() => onNavigate?.("history")}>Apri History</Button>}
    >
      {events.length ? (
        <Stack spacing={0}>
          {events.map((event, index) => (
            <Box key={`${event.title}-${index}`} sx={{ position: "relative", pl: 3, pb: index === events.length - 1 ? 0 : 1.5 }}>
              <Box sx={{ position: "absolute", left: 5, top: 5, width: 9, height: 9, borderRadius: "50%", bgcolor: "primary.main" }} />
              {index < events.length - 1 ? <Box sx={{ position: "absolute", left: 9, top: 15, bottom: 0, width: 1, bgcolor: "divider" }} /> : null}
              <Typography variant="caption" color="text.secondary">{formatDateTime(event.time)}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{event.title}</Typography>
              <Typography variant="caption" color="text.secondary">{event.detail}</Typography>
            </Box>
          ))}
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">Nessuna attività recente disponibile.</Typography>}
    </SectionCard>
  );
}

function RecommendedActions({ clients, qualification, onRefresh, onReboot, onNavigate }) {
  const qualificationScore = safeNumber(qualification?.score?.score, null);
  const actions = [
    {
      title: "Verifica client WiFi",
      detail: clients.length ? `${clients.length} client rilevati: apri il centro WiFi per l'analisi.` : "Nessun client rilevato: controlla radio, SSID e inventario client.",
      label: "Apri WiFi",
      icon: IconWifi,
      tone: clients.length ? "success" : "warning",
      run: () => onNavigate?.("wifi"),
    },
    {
      title: "Esegui diagnostica",
      detail: "Avvia test disponibili e consulta la cronologia operativa del dispositivo.",
      label: "Apri Diagnostics",
      icon: IconShieldCheck,
      tone: "info",
      run: () => onNavigate?.("diagnostics"),
    },
    {
      title: "Consulta qualification",
      detail: qualificationScore === null ? "Profilo non ancora valutato." : `Score ${qualificationScore}/100: consulta capability, evidenze e limitazioni.`,
      label: "Apri Qualification",
      icon: IconCertificate,
      tone: qualificationScore !== null && qualificationScore >= 60 ? "success" : "info",
      run: () => onNavigate?.("qualification"),
    },
  ];

  return (
    <SectionCard title="Azioni raccomandate" icon={IconAlertTriangle}>
      <Stack spacing={1}>
        {actions.map((action) => (
          <Paper key={action.title} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ mt: 0.25, color: action.tone === "warning" ? "warning.main" : action.tone === "success" ? "success.main" : "primary.main" }}><action.icon size={18} /></Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 900 }}>{action.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{action.detail}</Typography>
                </Box>
              </Stack>
              <Button size="small" variant="outlined" onClick={action.run}>{action.label}</Button>
            </Stack>
          </Paper>
        ))}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" startIcon={<IconRefresh size={16} />} onClick={onRefresh}>Aggiorna dati</Button>
          <Button variant="outlined" color="warning" startIcon={<IconRouter size={16} />} onClick={onReboot}>Riavvia dispositivo</Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}

function TechnicalSnapshot({ device, overview, diagnostics, qualification }) {
  const rows = [
    ["Produttore / modello", [safeText(firstValue(overview?.manufacturer, device?.manufacturer), "N/D"), safeText(firstValue(overview?.model, device?.model, overview?.product_class), "N/D")].join(" ")],
    ["Seriale", safeText(firstValue(overview?.serial_number, device?.serial_number, device?.serial))],
    ["Product class", safeText(firstValue(overview?.product_class, device?.product_class))],
    ["Hardware", safeText(firstValue(overview?.hardware_version, device?.hardware_version))],
    ["Firmware", safeText(firstValue(overview?.software_version, device?.software_version))],
    ["Uptime", formatDuration(firstValue(diagnostics?.uptime_seconds, overview?.uptime_seconds))],
    ["Username PPP", safeText(firstValue(diagnostics?.ppp_username, diagnostics?.ppp?.username))],
    ["Ultimo Inform", formatDateTime(firstValue(overview?.last_seen, overview?.last_inform, device?.last_seen))],
    ["Identità ACS", safeText(firstValue(overview?.acs_identity_count, device?.acs_identity_count), "1")],
    ["Profilo qualification", safeText(qualification?.profile_code)],
  ];
  return (
    <SectionCard title="Technical Snapshot" icon={IconCpu}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: 1 }}>
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ p: 1.1, borderRadius: 1.25, bgcolor: "#f8fafc" }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}

export default function Device360OverviewWorkspace({ onRefresh, onReboot, onNavigate, history }) {
  const shared = useDevice360SharedState();
  const device = shared.device || {};
  const overview = shared.overview || {};
  const diagnostics = shared.diagnostics || {};
  const wifi = shared.wifi || {};
  const clients = Array.isArray(shared.clients) ? shared.clients : [];
  const qualification = shared.qualification || {};

  return (
    <Stack spacing={1.5} data-release={RELEASE}>
      <DeviceVisualHero device={device} overview={overview} diagnostics={diagnostics} qualification={qualification} onNavigate={onNavigate} />
      <ServiceHealthMap overview={overview} diagnostics={diagnostics} wifi={wifi} clients={clients} qualification={qualification} />
      <OperationalInsights overview={overview} diagnostics={diagnostics} wifi={wifi} clients={clients} qualification={qualification} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1.25fr) minmax(340px,.75fr)" }, gap: 1.5, alignItems: "start" }}>
        <Stack spacing={1.5}>
          <RecentActivity overview={overview} diagnostics={diagnostics} qualification={qualification} history={history} onNavigate={onNavigate} />
          <TechnicalSnapshot device={device} overview={overview} diagnostics={diagnostics} qualification={qualification} />
        </Stack>
        <RecommendedActions clients={clients} qualification={qualification} onRefresh={onRefresh} onReboot={onReboot} onNavigate={onNavigate} />
      </Box>
    </Stack>
  );
}
