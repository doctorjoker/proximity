import { Box, Stack, Typography } from '@mui/material'
import WorkspaceStatusPill from './WorkspaceStatusPill'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceSectionHeader({ eyebrow, title, subtitle, status, statusTone, actions, sx }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2} sx={sx}>
      <Box minWidth={0}>
        {eyebrow && (
          <Typography variant="overline" sx={{ color: workspaceTokens.shell.primary, fontWeight: 900, letterSpacing: 1.1 }}>
            {eyebrow}
          </Typography>
        )}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="h5" sx={{ color: workspaceTokens.shell.text, fontWeight: 850, letterSpacing: -0.35 }}>
            {title}
          </Typography>
          {status && <WorkspaceStatusPill label={status} tone={statusTone} />}
        </Stack>
        {subtitle && <Typography variant="body2" sx={{ color: workspaceTokens.shell.textMuted, mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Box flexShrink={0}>{actions}</Box>}
    </Stack>
  )
}
