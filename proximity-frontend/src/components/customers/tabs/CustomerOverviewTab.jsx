import React from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import SurfaceCard from "../../ui/SurfaceCard";
import InfoRow from "../../ui/InfoRow";
import { safe } from "./customerTabUtils";

export default function CustomerOverviewTab({ detail }) {
  const customer = detail?.customer || {};
  const devices = detail?.devices || [];
  const online = devices.filter((device) => device.online).length;

  return (
    <Stack spacing={2}>
      <Grid container spacing={1.4}>
        <Grid item xs={6}><SurfaceCard><Box sx={{ p: 1.7 }}><InfoRow label="Cliente" value={safe(customer.customer_name)} /></Box></SurfaceCard></Grid>
        <Grid item xs={6}><SurfaceCard><Box sx={{ p: 1.7 }}><InfoRow label="Contratto" value={safe(customer.contract_number)} /></Box></SurfaceCard></Grid>
        <Grid item xs={6}><SurfaceCard><Box sx={{ p: 1.7 }}><InfoRow label="Profilo" value={safe(customer.profile)} /></Box></SurfaceCard></Grid>
        <Grid item xs={6}><SurfaceCard><Box sx={{ p: 1.7 }}><InfoRow label="Router online" value={`${online}/${devices.length}`} /></Box></SurfaceCard></Grid>
      </Grid>

      <SurfaceCard>
        <Box sx={{ p: 2.2 }}>
          <Typography sx={{ fontWeight: 950, mb: 1.8 }}>Informazioni cliente</Typography>
          <Grid container spacing={1.8}>
            <Grid item xs={6}><InfoRow label="Codice cliente" value={safe(customer.customer_code)} /></Grid>
            <Grid item xs={6}><InfoRow label="Contratto" value={safe(customer.contract_number)} /></Grid>
            <Grid item xs={12}><InfoRow label="PPPoE" value={safe(customer.radius_login)} /></Grid>
            <Grid item xs={12}><InfoRow label="Indirizzo" value={`${safe(customer.address, "")} ${safe(customer.civic_number, "")} ${safe(customer.city, "")} ${safe(customer.province, "")}`} /></Grid>
            <Grid item xs={6}><InfoRow label="Email" value={safe(customer.email)} /></Grid>
            <Grid item xs={6}><InfoRow label="Mobile" value={safe(customer.mobile)} /></Grid>
          </Grid>
        </Box>
      </SurfaceCard>
    </Stack>
  );
}
