import { Box, LinearProgress, Stack, Typography } from "@mui/material";

export default function OperationProgress({ value = 0 }) {
  const safeValue = Math.max(
    0,
    Math.min(100, Number(value) || 0),
  );

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1, minWidth: 120 }}>
        <LinearProgress
          variant="determinate"
          value={safeValue}
          sx={{
            height: 7,
            borderRadius: 10,
            bgcolor: "#e5e7eb",
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          minWidth: 36,
          textAlign: "right",
          fontWeight: 700,
          color: "text.secondary",
        }}
      >
        {safeValue}%
      </Typography>
    </Stack>
  );
}
