import React from "react";
import { Info } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerServicesTab() {
  return <CustomerWorkspacePlaceholder icon={<Info sx={{ fontSize: 44 }} />} title="Servizi cliente" description="Workspace predisposto per servizi attivi, piani, contratti e stato amministrativo." />;
}
