import React from "react";
import { Box, Button, Chip, Grid, Stack, Typography } from "@mui/material";
import { Launch, Router } from "@mui/icons-material";
import SurfaceCard from "../../ui/SurfaceCard";
import InfoRow from "../../ui/InfoRow";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";
import { dateText, muted, safe } from "./customerTabUtils";

export default function CustomerDevicesTab({ devices, onOpenRouter }) {
  if (!devices?.length) {
    return <CustomerWorkspacePlaceholder icon={<Router sx={{ fontSize: 44 }} />} title="Nessun router associato" description="Il cliente non ha ancora un CPE collegato in Proximity." />;
  }

  return (
    <Stack spacing={1.5}>
      {devices.map((device) => (
        <SurfaceCard key={device.id}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box>
                <Typography sx={{ fontWeight: 950 }}>{safe(device.manufacturer)} {safe(device.model)}</Typography>
                <Typography sx={{ color: muted, fontSize: 12, overflowWrap: "anywhere" }}>{safe(device.acs_device_id)}</Typography>
              </Box>
              <Chip size="small" label={device.online ? "ONLINE" : "OFFLINE"} color={device.online ? "success" : "default"} sx={{ fontWeight: 900 }} />
            </Stack>
            <Grid container spacing={1.4} sx={{ mt: 0.6 }}>
              <Grid item xs={6}><InfoRow label="PPPoE" value={safe(device.pppoe_username)} /></Grid>
              <Grid item xs={6}><InfoRow label="WAN IP" value={safe(device.wan_ip)} /></Grid>
              <Grid item xs={6}><InfoRow label="Seriale" value={safe(device.serial_number)} /></Grid>
              <Grid item xs={6}><InfoRow label="Firmware" value={safe(device.software_version)} /></Grid>
              <Grid item xs={12}><InfoRow label="Last seen" value={dateText(device.last_seen)} /></Grid>
            </Grid>
            <Button fullWidth variant="contained" startIcon={<Launch />} onClick={() => onOpenRouter(device.id)} sx={{ mt: 1.8, textTransform: "none", fontWeight: 900, bgcolor: "#059669", "&:hover": { bgcolor: "#047857" } }}>
              Apri Router
            </Button>
          </Box>
        </SurfaceCard>
      ))}
    </Stack>
  );
}
