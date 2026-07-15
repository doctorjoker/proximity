import React from "react";
import { Storage } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerFirmwareTab() {
  return <CustomerWorkspacePlaceholder icon={<Storage sx={{ fontSize: 44 }} />} title="Firmware" description="Area predisposta per versione corrente, compliance e campagne firmware." />;
}
