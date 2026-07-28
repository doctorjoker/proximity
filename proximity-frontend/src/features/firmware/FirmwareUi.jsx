import React from "react";
import { Box, Card, Stack, Typography } from "@mui/material";

export const SectionTitle = ({ title, subtitle, action }) => (
  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
    <Box>
      <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.4 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Stack>
);

export const SoftCard = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 5,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.88)",
      boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
      backdropFilter: "blur(18px)",
      ...sx,
    }}
  >
    {children}
  </Card>
);
