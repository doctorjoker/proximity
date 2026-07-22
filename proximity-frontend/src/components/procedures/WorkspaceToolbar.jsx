import { Box, Stack, Typography } from "@mui/material";

export default function WorkspaceToolbar({ title, subtitle, accent = "#2563eb", actions, children }) {
  return (
    <Box
      sx={{
        border: "1px solid #dbe5f0",
        borderRadius: 2.35,
        bgcolor: "#fff",
        p: 1.25,
        minWidth: 0,
        position: "sticky",
        top: 0,
        zIndex: 3,
      }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1.2} alignItems="center">
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 4, height: 28, borderRadius: 99, bgcolor: accent, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: "#0f172a", fontWeight: 950, lineHeight: 1.2 }}>{title}</Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ display: "block", mt: 0.2, color: "#64748b", fontWeight: 700 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>
      {children && <Box sx={{ mt: 1.1 }}>{children}</Box>}
    </Box>
  );
}
