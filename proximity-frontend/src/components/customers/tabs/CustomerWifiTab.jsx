import React from "react";
import { Wifi } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerWifiTab() {
  return <CustomerWorkspacePlaceholder icon={<Wifi sx={{ fontSize: 44 }} />} title="WiFi Experience" description="Area predisposta per qualità WiFi, SSID, copertura e dispositivi connessi." />;
}
