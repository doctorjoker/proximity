import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconCertificate,
  IconChevronDown,
  IconCpu,
  IconRefresh,
  IconWifi,
  IconWorld,
} from "@tabler/icons-react";

import { useDevice360SharedState } from "./Device360SharedState";

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
};

const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null && value._value !== "") return String(value._value);
    return fallback;
  }
  return String(value);
};

const numericValue = (...values) => {
  const raw = firstValue(...values);
  if (raw === null) return null;
  const value = Number(typeof raw === "object" ? raw?._value : raw);
  return Number.isFinite(value) ? value : null;
};

const formatDateTime = (value) => {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("it-IT");
};

function resolveWan({ device, overview, diagnostics }) {
  const status = firstValue(
    diagnostics?.ppp_status,
    diagnostics?.ppp_interface_status,
    diagnostics?.ppp?.status,
    diagnostics?.wan_status,
    overview?.ppp_status,
    overview?.wan_status,
    device?.ppp_status,
    device?.wan_status,
  );
  const ip = firstValue(
    diagnostics?.wan_ip,
    diagnostics?.ip_wan,
    diagnostics?.ppp?.wan_ip,
    overview?.wan_ip,
    overview?.ip_wan,
    device?.wan_ip,
    device?.ip_wan,
  );
  const normalized = String(status || "").trim().toLowerCase();
  if (["connected", "up", "online", "active"].includes(normalized) || ip) {
    return { status: "Connected", ip: safeText(ip) };
  }
  if (["disconnected", "down", "offline", "inactive"].includes(normalized)) {
    return { status: "Disconnected", ip: safeText(ip) };
  }
  return { status: safeText(status), ip: safeText(ip) };
}

function resolveWifi({ wifi, overview, diagnostics }) {
  const source = wifi?.wifi || wifi || {};
  const radios = Array.isArray(source?.radios) ? source.radios : [];
  const fallback = numericValue(overview?.wifi_radio_count, diagnostics?.wifi_radio_count);
  const count = radios.length || fallback;
  const bands = radios.length
    ? radios.map((radio) => safeText(firstValue(radio?.band, radio?.frequency_band), "")).filter(Boolean).join(" · ")
    : "2.4 GHz · 5 GHz";
  return { count, bands };
}

function Kpi({ icon: Icon, label, value, helper, tone = "default" }) {
  const tones = {
    success: { bg: "#ecfdf5", border: "#bbf7d0", color: "#047857" },
    info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    warning: { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
    default: { bg: "#ffffff", border: "#e2e8f0", color: "#0f172a" },
  };
  const current = tones[tone] || tones.default;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0, bgcolor: current.bg, borderColor: current.border, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.1} alignItems="flex-start">
        <Box sx={{ color: current.color, mt: 0.2, flexShrink: 0 }}><Icon size={19} /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.45 }}>{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.15, color: current.color, overflowWrap: "anywhere" }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{helper}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function Device360OperationsHeader() {
  const {
    deviceId,
    device,
    overview,
    diagnostics,
    wifi,
    qualification,
    qualificationLoading,
    refreshQualification,
    activeSection,
  } = useDevice360SharedState();
  const [anchorEl, setAnchorEl] = useState(null);

  const merged = useMemo(() => ({ ...device, ...overview, ...diagnostics }), [device, diagnostics, overview]);
  const wan = resolveWan({ device, overview, diagnostics });
  const wifiState = resolveWifi({ wifi, overview, diagnostics });
  const healthScore = numericValue(diagnostics?.health_score, overview?.health_score, device?.health_score);
  const qualificationScore = numericValue(
    qualification?.score?.score,
    qualification?.qualification_score,
    device?.qualification_score,
  );
  const qualificationStatus = safeText(firstValue(
    qualification?.qualification_status,
    device?.qualification_status,
  ), "N/D");

  const model = safeText(firstValue(merged?.model, merged?.product_class, merged?.hardware_version), "Dispositivo");
  const manufacturer = safeText(firstValue(merged?.manufacturer, merged?.vendor), "");
  const firmware = safeText(firstValue(merged?.software_version, merged?.firmware_version));
  const serial = safeText(firstValue(merged?.serial_number, merged?.serial));
  const acsId = safeText(firstValue(merged?.acs_device_id, merged?.acs_id));
  const online = Boolean(firstValue(
    merged?.online,
    String(merged?.presence_state || "").toUpperCase() === "ONLINE",
    String(merged?.status || "").toUpperCase() === "ONLINE",
  ));
  const lastInform = formatDateTime(firstValue(merged?.last_seen, merged?.last_inform, merged?._lastInform));
  const customer = safeText(firstValue(merged?.customer_name, merged?.customer?.customer_name), "LAB DEVICE");
  const service = safeText(firstValue(merged?.service_name, merged?.service_code, merged?.plan_name), "Servizio Proximity");

  const dispatchOperation = (scope) => {
    window.dispatchEvent(new CustomEvent("device360:refresh", { detail: { deviceId, scope, activeTab: activeSection } }));
    setAnchorEl(null);
  };

  const refreshAll = () => {
    window.dispatchEvent(new CustomEvent("device360:refresh", { detail: { deviceId, scope: "all", activeTab: activeSection } }));
    refreshQualification();
  };

  return (
    <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
      <Box sx={{ px: { xs: 1.5, md: 2.5 }, pt: 1.5, pb: 1.25 }}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" sx={{ fontWeight: 950, letterSpacing: -0.6, lineHeight: 1.05 }}>{[manufacturer, model].filter(Boolean).join(" ")}</Typography>
              <Chip size="small" color={online ? "success" : "error"} label={online ? "ONLINE" : "OFFLINE"} sx={{ fontWeight: 900 }} />
              {qualificationStatus !== "N/D" ? <Chip size="small" variant="outlined" color="success" label={qualificationStatus} sx={{ fontWeight: 850 }} /> : null}
            </Stack>
            <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.45 }}>{customer} · {service}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Seriale {serial} · {acsId}</Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" startIcon={<IconRefresh size={17} />} onClick={refreshAll} disabled={qualificationLoading}>Aggiorna</Button>
            <Button variant="outlined" endIcon={<IconChevronDown size={16} />} onClick={(event) => setAnchorEl(event.currentTarget)}>Operazioni</Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => dispatchOperation(activeSection || "all")}>Aggiorna sezione corrente</MenuItem>
              <MenuItem onClick={() => dispatchOperation("all")}>Aggiorna tutto</MenuItem>
              <MenuItem onClick={() => dispatchOperation("diagnostics")}>Esegui diagnostica</MenuItem>
              <MenuItem onClick={() => dispatchOperation("wifi")}>Gestisci WiFi</MenuItem>
            </Menu>
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(5,minmax(0,1fr))" }, gap: 1, mt: 1.5 }}>
          <Kpi icon={IconActivityHeartbeat} label="Health" value={healthScore !== null ? `${healthScore}/100` : "N/D"} helper="Stato operativo" tone={healthScore !== null && healthScore >= 80 ? "success" : "default"} />
          <Kpi icon={IconWorld} label="WAN" value={wan.status} helper={wan.ip !== "N/D" ? `IP ${wan.ip}` : "IP non disponibile"} tone={wan.status === "Connected" ? "success" : "default"} />
          <Kpi icon={IconWifi} label="WiFi" value={wifiState.count !== null ? `${wifiState.count} radio` : "N/D"} helper={wifiState.bands} tone="info" />
          <Kpi icon={IconCpu} label="Firmware" value={firmware} helper="Versione installata" />
          <Kpi icon={IconCertificate} label="Qualification" value={qualificationScore !== null ? `${qualificationScore}/100` : "N/D"} helper={qualificationStatus} tone={qualificationScore !== null && qualificationScore >= 60 ? "success" : "default"} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(5,minmax(0,1fr))" }, gap: 1.25, mt: 1.2, pt: 1.15, borderTop: "1px solid", borderColor: "divider" }}>
          <Box><Typography variant="caption" color="text.secondary">Ultimo Inform</Typography><Typography variant="body2" sx={{ fontWeight: 850 }}>{lastInform}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">ACS primaria</Typography><Typography variant="body2" sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>{acsId}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Seriale</Typography><Typography variant="body2" sx={{ fontWeight: 850 }}>{serial}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Stato presenza</Typography><Typography variant="body2" sx={{ fontWeight: 850 }}>{online ? "ONLINE" : "OFFLINE"}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Sezione attiva</Typography><Typography variant="body2" sx={{ fontWeight: 850 }}>{safeText(activeSection, "overview")}</Typography></Box>
        </Box>
      </Box>
    </Box>
  );
}
