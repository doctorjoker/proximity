import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) return String(value._value);
    return fallback;
  }
  return String(value);
};

const SoftCard = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 5,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.86)",
      boxShadow: "none",
      ...sx,
    }}
  >
    {children}
  </Card>
);

export default function AcsTab({
  overview,
  selected,
  parameters,
  onRefresh,
  onReboot,
}) {
  return (
    <Stack spacing={2}>
      <SoftCard>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={950}>Identità ACS</Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
                Identificativi e stato runtime del dispositivo.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onRefresh} sx={{ borderRadius: 999, fontWeight: 900 }}>Refresh</Button>
              <Button variant="outlined" color="warning" onClick={onReboot} sx={{ borderRadius: 999, fontWeight: 900 }}>Reboot</Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
            <Typography><b>Seriale:</b> {safeText(overview?.serial_number)}</Typography>
            <Typography><b>Device Code:</b> {safeText(overview?.device_code)}</Typography>
            <Typography><b>ACS ID:</b> {safeText(overview?.acs_device_id || selected?.acs_device_id)}</Typography>
            <Typography><b>Last Seen:</b> {safeText(overview?.last_seen)}</Typography>
            <Typography><b>WAN IP:</b> {safeText(overview?.wan_ip)}</Typography>
            <Typography><b>LAN IP:</b> {safeText(overview?.lan_ip)}</Typography>
            <Typography><b>TR Model:</b> {safeText(overview?.root_data_model_version)}</Typography>
            <Typography sx={{ wordBreak: "break-word" }}><b>Connection Request:</b> {safeText(overview?.connection_request_url)}</Typography>
          </Box>
        </CardContent>
      </SoftCard>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Parametri ACS</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, mb: 2 }}>
            Primi 80 parametri rilevati dal modello dati.
          </Typography>
          <Stack spacing={1}>
            {(parameters || []).slice(0, 80).map((param) => (
              <Box key={param.name} sx={{ p: 1.25, borderRadius: 2.5, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.05)" }}>
                <Typography variant="caption" sx={{ color: "#64748b" }}>{param.name}</Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{safeText(param.value)}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </SoftCard>
    </Stack>
  );
}
