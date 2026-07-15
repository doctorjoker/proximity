import React from "react";
import { Box } from "@mui/material";
import SurfaceCard from "../../ui/SurfaceCard";
import EmptyState from "../../ui/EmptyState";

export default function CustomerWorkspacePlaceholder({ icon, title, description }) {
  return (
    <SurfaceCard>
      <Box sx={{ p: 3 }}>
        <EmptyState icon={icon} title={title} description={description} />
      </Box>
    </SurfaceCard>
  );
}
