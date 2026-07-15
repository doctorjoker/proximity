import React from "react";
import { Timeline } from "@mui/icons-material";
import CustomerWorkspacePlaceholder from "./CustomerWorkspacePlaceholder";

export default function CustomerTimelineTab() {
  return <CustomerWorkspacePlaceholder icon={<Timeline sx={{ fontSize: 44 }} />} title="Timeline cliente" description="Area predisposta per eventi cliente, associazioni CPE e attività operative." />;
}
