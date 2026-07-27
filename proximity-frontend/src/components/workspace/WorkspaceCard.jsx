import { Box, Divider, Stack, Typography } from '@mui/material'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceCard({ title, subtitle, actions, children, footer, sx, contentSx }) {
  return (
    <Box
      sx={{
        bgcolor: workspaceTokens.shell.surface,
        border: `1px solid ${workspaceTokens.shell.border}`,
        borderRadius: workspaceTokens.radius.medium,
        boxShadow: workspaceTokens.shadow.card,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {(title || subtitle || actions) && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} sx={{ px: 2.5, py: 2 }}>
          <Box minWidth={0}>
            {title && <Typography variant="subtitle1" fontWeight={800} color={workspaceTokens.shell.text}>{title}</Typography>}
            {subtitle && <Typography variant="body2" color={workspaceTokens.shell.textMuted} sx={{ mt: 0.35 }}>{subtitle}</Typography>}
          </Box>
          {actions && <Box flexShrink={0}>{actions}</Box>}
        </Stack>
      )}
      {(title || subtitle || actions) && <Divider />}
      <Box sx={{ p: 2.5, ...contentSx }}>{children}</Box>
      {footer && (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.75, bgcolor: workspaceTokens.shell.surfaceMuted }}>{footer}</Box>
        </>
      )}
    </Box>
  )
}
