import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Router, Storage } from "@mui/icons-material";

const safe = (value, fallback = "N/D") => value === null || value === undefined || value === "" ? fallback : String(value);

export default function Customer360Summary({ detail }) {
  const customer = detail?.customer || {};
  const devices = detail?.devices || [];
  const online = devices.filter((device) => device.online).length;
  const firstDevice = devices[0];

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.6 }}>
      <Chip size="small" label={online > 0 ? "ONLINE" : "OFFLINE"} color={online > 0 ? "success" : "default"} sx={{ fontWeight: 900 }} />
      <Chip size="small" label={safe(customer.profile, "Profilo N/D")} sx={{ fontWeight: 800, bgcolor: "rgba(255,255,255,.12)", color: "white" }} />
      <Chip size="small" icon={<Router />} label={`${devices.length} router`} sx={{ fontWeight: 800, bgcolor: "rgba(255,255,255,.12)", color: "white", "& .MuiChip-icon": { color: "#93c5fd" } }} />
      <Chip size="small" icon={<Storage />} label={firstDevice?.software_version ? `FW ${firstDevice.software_version}` : "Firmware N/D"} sx={{ fontWeight: 800, bgcolor: "rgba(255,255,255,.12)", color: "white", "& .MuiChip-icon": { color: "#93c5fd" } }} />
    </Stack>
  );
}
