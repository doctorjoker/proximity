import PropTypes from "prop-types";
import { Box, Paper, Stack, Typography } from "@mui/material";

export default function DashboardPanel({ eyebrow, title, description, action, children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 2.25 },
        borderRadius: 2,
        boxShadow: "none",
        minWidth: 0,
        ...sx,
      }}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            {eyebrow && (
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: ".09em" }}>
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
            {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>}
          </Box>
          {action && <Box sx={{ flex: "0 0 auto" }}>{action}</Box>}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

DashboardPanel.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.node,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};
