import { Box, Stack, Typography } from "@mui/material";

export default function WorkspaceMetrics({ items = [], accent = "#2563eb" }) {
  return (
    <Box
      sx={{
        border: "1px solid #dbe5f0",
        borderRadius: 2.35,
        bgcolor: "#fff",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        divider={<Box sx={{ width: "1px", bgcolor: "#e2e8f0", my: 1 }} />}
        sx={{ minWidth: 0 }}
      >
        {items.map((item) => (
          <Box key={item.label} sx={{ flex: 1, minWidth: 0, px: 1.35, py: 1.05 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#64748b",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 0.46,
                lineHeight: 1.15,
              }}
            >
              {item.label}
            </Typography>
            <Typography
              sx={{
                mt: 0.35,
                color: item.highlight ? accent : "#0f172a",
                fontSize: 18,
                fontWeight: 950,
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.value ?? "-"}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
