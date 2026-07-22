import { Box, Stack, Typography } from '@mui/material'

export default function WorkspaceHeader({ eyebrow, title, subtitle, actions, children, sx }) {
  return (
    <Box sx={{ ...sx }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800 }}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant="h4">{title}</Typography>
          {subtitle ? (
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 880 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ? <WorkspaceActions>{actions}</WorkspaceActions> : null}
      </Stack>
      {children}
    </Box>
  )
}

export function WorkspaceActions({ children, sx }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={sx}>
      {children}
    </Stack>
  )
}
