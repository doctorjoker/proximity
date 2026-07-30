import React from "react";
import HealthPppSection from "./HealthPppSection";
import {
  Box, Card, CardContent, Chip, Divider, LinearProgress, Stack, Typography,
} from "@mui/material";

const numberValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = typeof value === "object" ? value?._value : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const textValue = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value?._value ?? fallback;
  return String(value);
};

const firstNumber = (...values) => {
  for (const value of values) {
    const parsed = numberValue(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstText = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return textValue(value);
    }
  }
  return "N/D";
};

const clamp = (value) => Math.max(0, Math.min(100, numberValue(value) ?? 0));

const scoreStyle = (score) => {
  if (score === null) return { label: "Da verificare", color: "#64748b", bg: "rgba(100,116,139,.10)" };
  if (score >= 85) return { label: "Excellent", color: "#059669", bg: "rgba(5,150,105,.10)" };
  if (score >= 70) return { label: "Good", color: "#2563eb", bg: "rgba(37,99,235,.10)" };
  if (score >= 50) return { label: "Attention", color: "#d97706", bg: "rgba(217,119,6,.10)" };
  return { label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,.10)" };
};

const riskColor = (risk) => {
  const value = textValue(risk, "UNKNOWN").toUpperCase();
  if (["LOW", "BASSO"].includes(value)) return "success";
  if (["MEDIUM", "MEDIO"].includes(value)) return "warning";
  if (["HIGH", "ALTO", "CRITICAL", "CRITICO"].includes(value)) return "error";
  return "default";
};

const uptimeLabel = (value) => {
  const seconds = numberValue(value);
  if (seconds === null) return textValue(value);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}g ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const SoftCard = ({ children, sx }) => (
  <Card elevation={0} sx={{
    borderRadius: 5,
    border: "1px solid rgba(15,23,42,.08)",
    background: "rgba(255,255,255,.90)",
    boxShadow: "none",
    ...sx,
  }}>
    {children}
  </Card>
);

const Metric = ({ label, value, progress, helper }) => (
  <SoftCard>
    <CardContent sx={{ p: 2.25 }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={950} sx={{ mt: .5 }}>{value}</Typography>
      {helper && <Typography variant="body2" sx={{ color: "#64748b", mt: .5 }}>{helper}</Typography>}
      {progress !== null && progress !== undefined && (
        <LinearProgress variant="determinate" value={clamp(progress)} sx={{ mt: 1.5, height: 7, borderRadius: 999 }} />
      )}
    </CardContent>
  </SoftCard>
);

const Finding = ({ item }) => {
  const severity = textValue(item?.severity || item?.level || item?.type, "INFO").toUpperCase();
  const critical = ["ERROR", "CRITICAL", "HIGH"].includes(severity);
  const warning = ["WARNING", "WARN", "MEDIUM"].includes(severity);
  const marker = critical ? "X" : warning ? "!" : "OK";
  const color = critical ? "#dc2626" : warning ? "#d97706" : "#059669";

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)" }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Typography fontWeight={950} sx={{ color }}>{marker}</Typography>
        <Box>
          <Typography fontWeight={900}>{textValue(item?.title || item?.name || item?.message, "Finding")}</Typography>
          {(item?.description || item?.detail) && (
            <Typography variant="body2" sx={{ color: "#64748b", mt: .25 }}>
              {textValue(item.description || item.detail)}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default function HealthTab({ overview, diagnostics, wifiQuality, clients }) {
  const score = firstNumber(
    diagnostics?.health_score,
    diagnostics?.score,
    overview?.health_score,
    wifiQuality?.health_score
  );
  const riskLevel =
    diagnostics?.risk_level ??
    diagnostics?.riskLevel ??
    overview?.risk_level ??
    overview?.riskLevel ??
    "N/D";
  const cpu = firstNumber(
    diagnostics?.cpu_usage_percent,
    diagnostics?.cpu_usage,
    diagnostics?.cpu_percent,
    overview?.cpu_usage_percent,
    overview?.cpu_usage
  );
  const memory = firstNumber(
    diagnostics?.memory_used_percent,
    diagnostics?.memory_usage_percent,
    diagnostics?.memory_usage,
    diagnostics?.memory_percent,
    overview?.memory_used_percent,
    overview?.memory_usage
  );
  const flash = firstNumber(diagnostics?.flash_usage, diagnostics?.storage_usage, overview?.flash_usage);
  const uptime = diagnostics?.uptime_seconds ?? diagnostics?.uptime ?? overview?.uptime_seconds ?? overview?.uptime;
  const latency = firstNumber(diagnostics?.latency_ms, diagnostics?.wan_latency_ms, diagnostics?.ping_ms);
  const packetLoss = firstNumber(diagnostics?.packet_loss, diagnostics?.packet_loss_percent);
  const reconnects = firstNumber(diagnostics?.reconnect_count, diagnostics?.wan_reconnects, diagnostics?.disconnect_count);

  const pppStatus = firstText(
    diagnostics?.ppp?.status,
    diagnostics?.ppp_status,
    diagnostics?.pppoe_status,
    diagnostics?.wan_connection_status,
    overview?.pppoe_status
  );
  const pppInterfaceStatus = firstText(
    diagnostics?.ppp?.interface_status,
    diagnostics?.ppp_interface_status
  );
  const wanIp = firstText(
    diagnostics?.ppp?.wan_ip,
    diagnostics?.wan_ip,
    diagnostics?.ppp?.local_ip,
    diagnostics?.ppp_local_ip
  );
  const pppLastError = firstText(
    diagnostics?.ppp?.last_error,
    diagnostics?.last_connection_error
  );

  const findings = Array.isArray(diagnostics?.findings)
    ? diagnostics.findings
    : Array.isArray(diagnostics?.issues)
      ? diagnostics.issues.map((message) => ({ severity: "warning", title: textValue(message) }))
      : [];

  const recommendations = Array.isArray(diagnostics?.recommendations)
    ? diagnostics.recommendations
    : Array.isArray(wifiQuality?.recommendations)
      ? wifiQuality.recommendations
      : [];

  const tone = scoreStyle(score);

  return (
    <Stack spacing={2}>
      <SoftCard sx={{ background: tone.bg }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="overline" sx={{ color: "#64748b", fontWeight: 950 }}>Device Assurance</Typography>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="h2" fontWeight={950} sx={{ color: tone.color }}>{score ?? "N/D"}</Typography>
                <Typography variant="h6" sx={{ color: "#64748b" }}>/100</Typography>
              </Stack>
              <Typography fontWeight={900} sx={{ color: tone.color }}>{tone.label}</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip label={`Risk ${riskLevel}`} color={riskColor(riskLevel)} sx={{ fontWeight: 900 }} />
              <Chip label={overview?.online ? "Healthy online" : "Offline"} color={overview?.online ? "success" : "default"} variant="outlined" sx={{ fontWeight: 900 }} />
            </Stack>
          </Stack>
          {score !== null && <LinearProgress variant="determinate" value={clamp(score)} sx={{ mt: 2.5, height: 10, borderRadius: 999 }} />}
        </CardContent>
      </SoftCard>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.5 }}>
        <Metric label="CPU" value={cpu === null ? "N/D" : `${Math.round(cpu)}%`} progress={cpu} />
        <Metric label="Memory" value={memory === null ? "N/D" : `${Math.round(memory)}%`} progress={memory} />
        <Metric label="Storage" value={flash === null ? "N/D" : `${Math.round(flash)}%`} progress={flash} />
        <Metric label="Uptime" value={uptimeLabel(uptime)} />
      </Box>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Connettività</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: .5 }}>Stato sintetico della connettivita WAN e PPP.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.5 }}>
            <Metric label="WAN" value={overview?.online ? "Online" : "Offline"} helper={wanIp === "N/D" ? textValue(diagnostics?.wan_status, "Stato ACS") : `IP ${wanIp}`} />
            <Metric
              label="PPPoE"
              value={pppStatus}
              helper={pppLastError !== "N/D" && pppLastError !== "ERROR_NONE"
                ? pppLastError
                : pppInterfaceStatus !== "N/D"
                  ? `Interfaccia ${pppInterfaceStatus}`
                  : null}
            />
            <Metric label="Latency" value={latency === null ? "N/D" : `${Math.round(latency)} ms`} />
            <Metric label="Packet Loss" value={packetLoss === null ? "N/D" : `${packetLoss}%`} helper={reconnects === null ? null : `${reconnects} reconnect`} />
          </Box>
        </CardContent>
      </SoftCard>

      <HealthPppSection diagnostics={diagnostics} />

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Stabilità WiFi</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: .5 }}>Qualita radio e utilizzo della rete locale.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.5 }}>
            <Metric label="WiFi Score" value={wifiQuality?.score ?? "N/D"} progress={wifiQuality?.score} />
            <Metric label="Rating" value={textValue(wifiQuality?.rating)} />
            <Metric label="Client attivi" value={clients?.active_count ?? clients?.count ?? 0} />
            <Metric label="Band Steering" value={firstText(diagnostics?.band_steering_status, wifiQuality?.band_steering_status)} />
          </Box>
        </CardContent>
      </SoftCard>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <SoftCard>
          <CardContent>
            <Typography variant="h6" fontWeight={950}>Evidenze</Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: .5, mb: 2 }}>Evidenze raccolte da ACS, diagnostica e WiFi analytics.</Typography>
            <Stack spacing={1}>
              {findings.length
                ? findings.slice(0, 10).map((item, index) => <Finding key={`finding-${index}`} item={item} />)
                : <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc" }}><Typography fontWeight={900} sx={{ color: "#059669" }}>OK Nessun finding critico disponibile</Typography></Box>}
            </Stack>
          </CardContent>
        </SoftCard>

        <SoftCard>
          <CardContent>
            <Typography variant="h6" fontWeight={950}>Raccomandazioni</Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: .5, mb: 2 }}>Azioni suggerite in base allo stato corrente del dispositivo.</Typography>
            <Stack spacing={1}>
              {recommendations.length
                ? recommendations.slice(0, 10).map((item, index) => (
                    <Box key={`recommendation-${index}`} sx={{ p: 1.5, borderRadius: 3, border: "1px solid rgba(37,99,235,.10)", background: "rgba(37,99,235,.05)" }}>
                      <Typography fontWeight={900}>{typeof item === "string" ? item : textValue(item?.title || item?.name || item?.message)}</Typography>
                      {typeof item === "object" && (item?.description || item?.detail) && (
                        <Typography variant="body2" sx={{ color: "#64748b", mt: .25 }}>{textValue(item.description || item.detail)}</Typography>
                      )}
                    </Box>
                  ))
                : <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc" }}><Typography sx={{ color: "#64748b" }}>Nessuna raccomandazione disponibile.</Typography></Box>}
            </Stack>
          </CardContent>
        </SoftCard>
      </Box>
    
</Stack>
  );
}
