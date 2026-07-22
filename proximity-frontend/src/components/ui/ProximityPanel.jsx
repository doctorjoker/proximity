import { Box, Paper } from "@mui/material";

/** Standard white workspace panel matching the Dashboard surface language. */
export default function ProximityPanel({ children, header, sx, bodySx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        ...sx,
      }}
    >
      {header ? (
        <Box sx={{ p: 1.4, borderBottom: "1px solid", borderColor: "divider" }}>
          {header}
        </Box>
      ) : null}
      <Box sx={bodySx}>{children}</Box>
    </Paper>
  );
}
