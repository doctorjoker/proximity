import { Box, Typography } from "@mui/material";

export default function InfoRow({ label, value }) {
  return (
    <Box>
      <Typography sx={{ color: "#64748b", fontSize: 11.5, fontWeight: 850, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 850, overflowWrap: "anywhere", mt: 0.15 }}>
        {value}
      </Typography>
    </Box>
  );
}
