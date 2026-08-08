import React from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Paper, Stack, Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat, IconBox, IconCheck, IconCpu,
  IconDeviceDesktop, IconRefresh, IconRouter, IconShieldCheck, IconWifi,
} from "@tabler/icons-react";

import useDeviceDigitalTwin from "./hooks/useDeviceDigitalTwin";

const supportColor = (support) => {
  const value = String(support || "").toUpperCase();
  if (value === "SUPPORTED") return "success";
  if (value === "LIMITED") return "warning";
  if (value === "UNSUPPORTED") return "error";
  return "default";
};

function InfoRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: .8 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 850, textAlign: "right" }}>
        {value || "N/D"}
      </Typography>
    </Stack>
  );
}

function CapabilityList({ title, icon: Icon, items }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon size={19} />
        <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>{title}</Typography>
      </Stack>
      <Divider sx={{ my: 1.25 }} />
      <Stack spacing={1}>
        {items.length ? items.map(([code, item]) => (
          <Stack key={code} direction="row" justifyContent="space-between" spacing={1} alignItems="center">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 850 }}>{code}</Typography>
              {item?.reason ? <Typography variant="caption" color="text.secondary">{item.reason}</Typography> : null}
            </Box>
            <Chip size="small" color={supportColor(item?.support)} label={item?.support || "N/D"} />
          </Stack>
        )) : <Typography variant="body2" color="text.secondary">Nessun dato disponibile.</Typography>}
      </Stack>
    </Paper>
  );
}

export default function Device360DigitalTwinOverview({ device, deviceId }) {
  const resolvedDeviceId = deviceId || device?.id || device?.device_id;
  const { digitalTwin, loading, error, reload } = useDeviceDigitalTwin(resolvedDeviceId);

  const twin = digitalTwin?.digital_twin || digitalTwin?.twin || digitalTwin || {};
  const identity = twin?.identity || twin?.driver?.identity || {};
  const hardware = twin?.hardware || {};
  const firmware = twin?.firmware || {};
  const inventory = twin?.inventory || {};
  const wifi = twin?.wifi || {};
  const diagnostics = twin?.diagnostics || {};
  const procedures = twin?.procedures || {};
  const remoteActions = twin?.remote_actions || {};
  const coverage = digitalTwin?.coverage || twin?.coverage || {};

  const image = identity?.image || twin?.driver?.identity?.image || "/devices/generic/unknown.png";
  const model = identity?.model || twin?.driver?.product_class || device?.model || "CPE";
  const vendor = twin?.driver?.vendor || identity?.vendor || device?.manufacturer || device?.vendor || "N/D";

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 2.5, background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
          <Box sx={{ width: { xs: "100%", md: 260 }, minHeight: 170, borderRadius: 2, bgcolor: "#fff", border: "1px solid", borderColor: "divider", display: "grid", placeItems: "center", p: 2 }}>
            <Box component="img" src={image} alt={model} sx={{ maxWidth: "100%", maxHeight: 150, objectFit: "contain" }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontWeight: 950 }}>{vendor} {model}</Typography>
              <Chip icon={<IconShieldCheck size={15} />} label="Digital Twin" color="primary" />
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mt: .5 }}>
              {identity?.description || "Profilo digitale normalizzato del dispositivo."}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {Object.entries(coverage).filter(([, enabled]) => Boolean(enabled)).map(([key]) => (
                <Chip key={key} size="small" icon={<IconCheck size={14} />} label={key.replaceAll("_", " ")} variant="outlined" />
              ))}
            </Stack>
          </Box>

          <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <IconRefresh size={17} />} onClick={reload} disabled={loading || !resolvedDeviceId}>
            Aggiorna
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center"><IconDeviceDesktop size={19} /><Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Identità</Typography></Stack>
          <Divider sx={{ my: 1.25 }} />
          <InfoRow label="Vendor" value={vendor} />
          <Divider />
          <InfoRow label="Modello" value={model} />
          <Divider />
          <InfoRow label="Famiglia" value={identity?.family} />
          <Divider />
          <InfoRow label="Categoria" value={identity?.category} />
          <Divider />
          <InfoRow label="Data model" value={twin?.driver?.data_model || digitalTwin?.driver?.data_model} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center"><IconCpu size={19} /><Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Hardware</Typography></Stack>
          <Divider sx={{ my: 1.25 }} />
          {Object.entries(hardware).slice(0, 8).map(([key, value], index) => (
            <React.Fragment key={key}>
              {index ? <Divider /> : null}
              <InfoRow label={key.replaceAll("_", " ")} value={typeof value === "object" ? value?.value || value?.support : value} />
            </React.Fragment>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center"><IconBox size={19} /><Typography variant="subtitle1" sx={{ fontWeight: 950 }}>Firmware</Typography></Stack>
          <Divider sx={{ my: 1.25 }} />
          <InfoRow label="Installato" value={firmware?.software_version || firmware?.installed_version} />
          <Divider />
          <InfoRow label="Hardware version" value={firmware?.hardware_version} />
          <Divider />
          <InfoRow label="Stato" value={firmware?.status || firmware?.qualification} />
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.5 }}>
        <CapabilityList title="WiFi e inventario" icon={IconWifi} items={Object.entries({ ...wifi, ...inventory }).slice(0, 12)} />
        <CapabilityList title="Diagnostiche" icon={IconRouter} items={Object.entries(diagnostics).slice(0, 12)} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.5 }}>
        <CapabilityList title="Azioni remote" icon={IconRefresh} items={Object.entries(remoteActions).slice(0, 12)} />
        <CapabilityList title="Procedure disponibili" icon={IconActivityHeartbeat} items={Object.entries(procedures).slice(0, 12)} />
      </Box>
    </Stack>
  );
}
