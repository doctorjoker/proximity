import React from "react";
import { Box, Typography } from "@mui/material";
import SurfaceCard from "../ui/SurfaceCard";
import CustomerTable from "./CustomerTable";

const border = "rgba(148,163,184,.24)";
const muted = "#64748b";

export default function CustomerWorkspace({ customers, loading, onOpenCustomer }) {
  return (
    <SurfaceCard>
      <Box sx={{ px: 2.2, py: 1.8, borderBottom: `1px solid ${border}` }}>
        <Typography sx={{ fontWeight: 950, fontSize: 18 }}>Customer Workspace</Typography>
        <Typography sx={{ color: muted, fontSize: 13 }}>Clienti, servizi e apparati associati.</Typography>
      </Box>
      <CustomerTable customers={customers} loading={loading} onOpenCustomer={onOpenCustomer} />
    </SurfaceCard>
  );
}
