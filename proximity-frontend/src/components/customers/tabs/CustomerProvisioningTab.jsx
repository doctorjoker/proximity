import React from "react";
import { Build } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerProvisioningTab() {
  return <CustomerWorkspacePlaceholder icon={<Build sx={{ fontSize: 44 }} />} title="Provisioning" description="Area predisposta per job, procedure, workflow ed esiti di provisioning." />;
}
