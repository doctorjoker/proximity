import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

function valueOf(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "N/D";
}

function numberOf(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function InfoCard({ title, value, subtitle }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5, wordBreak: "break-word" }}>
          {valueOf(value)}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, suffix = "%" }) {
  const numeric = numberOf(value);
  const safe = numeric === null ? 0 : Math.max(0, Math.min(100, numeric));
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="h6">
            {numeric === null ? "N/D" : `${numeric}${suffix}`}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={safe} sx={{ mt: 2, height: 8, borderRadius: 99 }} />
      </CardContent>
    </Card>
  );
}

export default function OverviewTab({ selected = {}, overview = {}, diagnostics = {} }) {
  const manufacturer = valueOf(overview.manufacturer, selected.manufacturer, selected.vendor);
  const model = valueOf(overview.model, selected.model, selected.product_class);
  const serial = valueOf(overview.serial_number, selected.serial_number, selected.serial);
  const acsId = valueOf(selected.acs_device_id, selected._id, overview.acs_device_id);
  const firmware = valueOf(
    overview.software_version,
    overview.firmware_version,
    selected.software_version,
    selected.firmware_version
  );
  const lastInform = valueOf(overview.last_inform, selected.last_inform, selected._lastInform);
  const uptime = valueOf(diagnostics.uptime_human, diagnostics.uptime_seconds, overview.uptime);
  const health = numberOf(diagnostics.health_score, overview.health_score, selected.health_score);
  const risk = valueOf(diagnostics.risk, diagnostics.risk_level, overview.risk, selected.risk);
  const status = valueOf(diagnostics.status, overview.status, selected.status);
  const wanStatus = valueOf(
    diagnostics.ppp_status,
    diagnostics.wan_status,
    overview.wan_status,
    selected.wan_status
  );
  const wanIp = valueOf(
    diagnostics.wan_ip,
    diagnostics.ip_address,
    overview.wan_ip,
    selected.wan_ip,
    selected.ip_address
  );
  const pppUser = valueOf(diagnostics.ppp_username, overview.ppp_username, selected.ppp_username);
  const cpu = numberOf(diagnostics.cpu_percent, diagnostics.cpu, overview.cpu_percent);
  const memoryUsed = numberOf(
    diagnostics.memory_used_percent,
    diagnostics.memory_percent,
    diagnostics.memory_free_percent !== undefined
      ? 100 - Number(diagnostics.memory_free_percent)
      : undefined,
    overview.memory_used_percent
  );
  const wifiScore = numberOf(overview.wifi_score, diagnostics.wifi_score, selected.wifi_score);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6">Riepilogo dispositivo</Typography>
        <Typography variant="body2" color="text.secondary">
          Stato operativo, connettività e risorse principali del CPE.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={`Stato: ${status}`} color={String(status).toUpperCase().includes("GOOD") || String(status).toUpperCase().includes("ONLINE") ? "success" : "default"} />
        <Chip label={`WAN: ${wanStatus}`} variant="outlined" />
        <Chip label={`Rischio: ${risk}`} variant="outlined" />
        <Chip label={`Firmware: ${firmware}`} variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}><InfoCard title="Produttore" value={manufacturer} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><InfoCard title="Modello" value={model} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><InfoCard title="Seriale" value={serial} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><InfoCard title="ACS ID" value={acsId} /></Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>Connettività</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><InfoCard title="WAN / PPP" value={wanStatus} /></Grid>
            <Grid item xs={12} md={4}><InfoCard title="IP WAN" value={wanIp} /></Grid>
            <Grid item xs={12} md={4}><InfoCard title="Username PPP" value={pppUser} /></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Health" value={health} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="CPU" value={cpu} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Memoria usata" value={memoryUsed} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="WiFi score" value={wifiScore} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}><InfoCard title="Uptime" value={uptime} /></Grid>
        <Grid item xs={12} md={4}><InfoCard title="Ultimo Inform" value={lastInform} /></Grid>
        <Grid item xs={12} md={4}><InfoCard title="Versione firmware" value={firmware} /></Grid>
      </Grid>
    </Stack>
  );
}
