import { Box, Stack, Typography } from '@mui/material';

export default function DashboardSection({ eyebrow, title, description, action, children }) {
  return (
    <Box component="section">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1.2}
        sx={{ mb: 1.35 }}
      >
        <Box>
          {eyebrow && (
            <Typography variant="overline" color="primary" fontWeight={900} letterSpacing={1.1} lineHeight={1.2}>
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h6" fontWeight={950} sx={{ mt: 0.15 }}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}
