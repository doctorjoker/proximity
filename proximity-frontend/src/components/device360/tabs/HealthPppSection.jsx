import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

const valueOrNd = (value) => {
  if (value === null || value === undefined || value === "") return "N/D";
  return String(value);
};

const stateColor = (value) => {
  const normalized = String(value ?? "").toLowerCase();
  if (["connected", "up", "online", "error_none"].includes(normalized)) return "success";
  if (["connecting", "pending", "unknown"].includes(normalized)) return "warning";
  if (["disconnected", "down", "error"].includes(normalized)) return "error";
  return "default";
};

function DetailRow({ label, value, chip = false }) {
  const shown = valueOrNd(value);
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ py: 0.85, minHeight: 38 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {chip && shown !== "N/D" ? (
        <Chip
          size="small"
          label={shown}
          color={stateColor(shown)}
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      ) : (
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textAlign: "right", wordBreak: "break-word" }}
        >
          {shown}
        </Typography>
      )}
    </Stack>
  );
}

export default function HealthPppSection({ diagnostics = {} }) {
  const ppp = diagnostics?.ppp ?? {};

  const status = ppp.status ?? diagnostics.ppp_status;
  const interfaceStatus = ppp.interface_status ?? diagnostics.ppp_interface_status;
  const username = ppp.username ?? diagnostics.ppp_username;
  const wanIp = ppp.wan_ip ?? diagnostics.wan_ip;
  const localIp = ppp.local_ip ?? diagnostics.ppp_local_ip;
  const remoteIp = ppp.remote_ip ?? diagnostics.ppp_remote_ip;
  const lastError = ppp.last_error ?? diagnostics.last_connection_error;
  const service = ppp.service ?? diagnostics.pppoe_service;
  const sessionId = ppp.session_id ?? diagnostics.pppoe_session;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={0.4}>
          <Typography variant="h6">Dettagli connessione</Typography>
          <Typography variant="body2" color="text.secondary">
            Sessione PPPoE, indirizzamento WAN e parametri operativi normalizzati dal backend.
          </Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, px: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ py: 0.75, fontWeight: 800 }}>
                Connessione
              </Typography>
              <DetailRow label="Stato PPP" value={status} chip />
              <DetailRow label="Interfaccia" value={interfaceStatus} chip />
              <DetailRow label="Username PPP" value={username} />
              <DetailRow label="Servizio PPPoE" value={service} />
              <DetailRow label="Session ID" value={sessionId} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, px: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ py: 0.75, fontWeight: 800 }}>
                Indirizzamento
              </Typography>
              <DetailRow label="WAN IP" value={wanIp} />
              <DetailRow label="PPP Local IP" value={localIp} />
              <DetailRow label="PPP Remote IP" value={remoteIp} />
              <DetailRow label="Ultimo errore" value={lastError} chip />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
