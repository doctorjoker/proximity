import { Box, Typography } from "@mui/material";

export default function EmptyState({ icon, title, description }) {
  return (
    <Box sx={{ py: 7, px: 3, textAlign: "center", color: "#64748b" }}>
      {icon ? <Box sx={{ mb: 1, color: "#94a3b8" }}>{icon}</Box> : null}
      <Typography sx={{ color: "#0f172a", fontWeight: 950, fontSize: 17 }}>{title}</Typography>
      {description ? <Typography sx={{ mt: 0.5 }}>{description}</Typography> : null}
    </Box>
  );
}
