import {
  Box,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function TopBar() {
  return (
    <Box
      sx={{
        height: 64,
        px: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "#0f172a",
        color: "white",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Operations Center
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Search customer, device, service..."
          sx={{
            width: 360,
            input: { color: "white" },
            "& .MuiOutlinedInput-root": {
              bgcolor: "#111827",
              borderRadius: 2,
              "& fieldset": { borderColor: "#334155" },
              "&:hover fieldset": { borderColor: "#475569" },
            },
          }}
        />

        <Chip size="small" label="LIVE" color="success" />

        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Admin
        </Typography>
      </Stack>
    </Box>
  );
}
