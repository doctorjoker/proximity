import { Box, Stack, Typography } from "@mui/material";

export default function WorkspacePanel({ title, icon: Icon, accent = "#2563eb", children, sx }) {
  return (
    <Box sx={{ border: "1px solid #dbe5f0", borderRadius: 2.35, bgcolor: "#fff", overflow: "hidden", minWidth: 0, ...sx }}>
      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ px: 1.35, py: 1.05, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        {Icon && <Icon sx={{ fontSize: 17, color: accent }} />}
        <Typography sx={{ fontWeight: 950, color: "#0f172a", fontSize: 14 }}>{title}</Typography>
      </Stack>
      <Box sx={{ p: 1.25, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
