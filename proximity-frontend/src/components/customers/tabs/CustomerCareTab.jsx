import React from "react";
import { SupportAgent } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerCareTab() {
  return <CustomerWorkspacePlaceholder icon={<SupportAgent sx={{ fontSize: 44 }} />} title="Customer Care" description="Area predisposta per eventi Proactive Care, severità e raccomandazioni." />;
}
