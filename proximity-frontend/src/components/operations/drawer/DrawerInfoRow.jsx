import {
  Stack,
  Typography,
} from "@mui/material";

export default function DrawerInfoRow({
  label,
  value,
}) {
  return (
    <Stack spacing={0.3} sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: "#64748b",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          fontWeight: 600,
        }}
      >
        {value || "-"}
      </Typography>
    </Stack>
  );
}
