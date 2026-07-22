import {
  Box,
  Divider,
  Typography,
} from "@mui/material";

export default function DrawerSection({
  title,
  children,
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="overline"
        sx={{
          color: "#64748b",
          fontWeight: 800,
          letterSpacing: 1.2,
        }}
      >
        {title}
      </Typography>

      <Divider sx={{ my: 1 }} />

      {children}
    </Box>
  );
}
