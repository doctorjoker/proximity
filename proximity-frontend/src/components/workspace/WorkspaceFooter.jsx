import { Box, Stack, Typography } from '@mui/material'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceFooter({ items = [], actions }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.25} sx={{ px: 2.5, py: 1.2, bgcolor: workspaceTokens.shell.surface, borderTop: `1px solid ${workspaceTokens.shell.border}` }}>
      <Stack direction="row" gap={2} flexWrap="wrap" useFlexGap>
        {items.filter(Boolean).map((item) => <Typography key={item.label} variant="caption" color={workspaceTokens.shell.textMuted}><strong>{item.label}:</strong> {item.value || '—'}</Typography>)}
      </Stack>
      {actions && <Box>{actions}</Box>}
    </Stack>
  )
}
