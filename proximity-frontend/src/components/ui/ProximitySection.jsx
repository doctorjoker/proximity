import { Box, Stack, Typography } from "@mui/material";

/**
 * Golden Reference section heading used by the Proximity Dashboard.
 * New product pages should use this component instead of introducing
 * local variants of page/section headers.
 */
export default function ProximitySection({
  eyebrow,
  title,
  description,
  action,
  children,
  component = "section",
  sx,
}) {
  return (
    <Box component={component} sx={sx}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.2}
        sx={{ mb: 1.35 }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography
              variant="overline"
              color="primary"
              fontWeight={900}
              letterSpacing={1.1}
              lineHeight={1.2}
            >
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h6" fontWeight={950} sx={{ mt: 0.15 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
      {children}
    </Box>
  );
}
