import { Box, Stack, Typography } from "@mui/material";

export default function StatusBar() {
  return (
    <Box
      sx={{
        height: 48,
        px: 3,
        display: "flex",
        alignItems: "center",
        bgcolor: "white",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <Stack direction="row" spacing={3}>
        <Typography variant="caption">EUREKA7.0.0</Typography>
        <Typography variant="caption">Backend: ONLINE</Typography>
        <Typography variant="caption">Worker: ONLINE</Typography>
        <Typography variant="caption">ACS: ONLINE</Typography>
      </Stack>
    </Box>
  );
}
