import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  TextField,
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

const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) value = value._value;
    else return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getHealthTone = (score) => {
  const n = safeNumber(score, null);
  if (n === null) return { fg: "#64748b" };
  if (n >= 80) return { fg: "#059669" };
  if (n >= 60) return { fg: "#d97706" };
  return { fg: "#dc2626" };
};

const SoftCard = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 5,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.86)",
      boxShadow: "none",
      backdropFilter: "blur(18px)",
      ...sx,
    }}
  >
    {children}
  </Card>
);

export default function OverviewTab({
  overview,
  wifiQuality,
  diagnostics,
  clients,
  newSSID,
  onSSIDChange,
  newWifiPassword,
  onWifiPasswordChange,
  wifiScanLoading,
  wifiOptimizeLoading,
  onWifiOptimize,
  onWifiScan,
  onRefresh,
  onReboot,
  onFirmwareUpgrade,
  onUpdateSSID,
  onUpdatePassword,
}) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        <SoftCard>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900 }}>WiFi</Typography>
            <Typography variant="h5" fontWeight={950}>{wifiQuality?.score ?? "N/D"}</Typography>
          </CardContent>
        </SoftCard>
        <SoftCard>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900 }}>Health</Typography>
            <Typography variant="h5" fontWeight={950}>{diagnostics?.health_score ?? "N/D"}</Typography>
          </CardContent>
        </SoftCard>
        <SoftCard>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900 }}>Client</Typography>
            <Typography variant="h5" fontWeight={950}>{clients?.active_count ?? clients?.count ?? "0"}</Typography>
          </CardContent>
        </SoftCard>
      </Box>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Azioni rapide</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
            <Button variant="contained" onClick={onWifiOptimize} disabled={wifiOptimizeLoading} sx={{ borderRadius: 999, fontWeight: 900 }}>
              {wifiOptimizeLoading ? "Ottimizzo..." : "Ottimizza WiFi"}
            </Button>
            <Button variant="outlined" onClick={onWifiScan} disabled={wifiScanLoading} sx={{ borderRadius: 999, fontWeight: 900 }}>
              {wifiScanLoading ? "Scan..." : "WiFi Scan"}
            </Button>
            <Button variant="outlined" onClick={onRefresh} sx={{ borderRadius: 999, fontWeight: 900 }}>Refresh</Button>
            <Button variant="outlined" color="warning" onClick={onReboot} sx={{ borderRadius: 999, fontWeight: 900 }}>Reboot</Button>
            <Button variant="contained" color="secondary" onClick={onFirmwareUpgrade} sx={{ borderRadius: 999, fontWeight: 900 }}>Aggiorna firmware</Button>
          </Stack>
          {(wifiScanLoading || wifiOptimizeLoading) && <LinearProgress sx={{ mt: 2, borderRadius: 999 }} />}
        </CardContent>
      </SoftCard>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>WiFi cliente</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField fullWidth label="Nome rete WiFi" value={newSSID} onChange={onSSIDChange} />
            <Button variant="contained" onClick={onUpdateSSID} sx={{ borderRadius: 999, fontWeight: 900, alignSelf: "flex-start" }}>Salva nome WiFi</Button>
            <Divider />
            <TextField fullWidth type="password" label="Nuova password WiFi" value={newWifiPassword} helperText="La password viene solo impostata via ACS, non letta dal router." onChange={onWifiPasswordChange} />
            <Button variant="contained" color="secondary" onClick={onUpdatePassword} sx={{ borderRadius: 999, fontWeight: 900, alignSelf: "flex-start" }}>Salva password</Button>
          </Stack>
        </CardContent>
      </SoftCard>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Esperienza WiFi</Typography>
          {wifiQuality ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h3" fontWeight={950} sx={{ color: getHealthTone(wifiQuality.score).fg }}>{wifiQuality.score ?? "N/D"}/100</Typography>
              <Typography fontWeight={900}>{wifiQuality.rating || "N/D"}</Typography>
              <Typography sx={{ mt: 1, fontSize: 22 }}>{"★".repeat(wifiQuality.stars || 0)}{"☆".repeat(5 - (wifiQuality.stars || 0))}</Typography>
              <Divider sx={{ my: 2 }} />
              {(wifiQuality.issues || []).slice(0, 4).map((item, index) => (
                <Typography key={`quality-issue-${index}`} variant="body2" sx={{ mt: 0.5 }}>• {item}</Typography>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "#64748b" }}>Dati qualità WiFi non disponibili.</Typography>
          )}
        </CardContent>
      </SoftCard>

      <SoftCard>
        <CardContent>
          <Typography variant="h6" fontWeight={950}>Client connessi</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Totali {clients?.count || 0} · attivi {clients?.active_count || 0}
          </Typography>
          <Stack spacing={1}>
            {(clients?.clients || []).slice(0, 10).map((client) => (
              <Box key={client.host_id || client.mac_address} sx={{ p: 1.5, borderRadius: 3, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography fontWeight={900}>{safeText(client.hostname, "Dispositivo")}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>{safeText(client.ip_address)} · {safeText(client.mac_address)}</Typography>
                  </Box>
                  <Chip size="small" label={client.active ? "Active" : "Inactive"} color={client.active ? "success" : "default"} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </SoftCard>
    </Stack>
  );
}
