import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material'
import ProximityActionIcon from '../icons/ProximityActionIcon'
import { getWorkspaceDomainToken, workspaceTokens } from './workspaceTokens'

export default function WorkspaceNavigationGroup({ title, subtitle, domain = 'Other', progress = 0, expanded = true, onToggle, icon, children }) {
  const token = getWorkspaceDomainToken(domain)
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0))
  return (
    <Box sx={{ mx: 1, my: 1, borderRadius: 2.25, border: `1px solid ${workspaceTokens.shell.border}`, bgcolor: workspaceTokens.shell.surface, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" gap={1.1} sx={{ p: 1.25, borderLeft: `4px solid ${token.color}` }}>
        {icon}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" gap={1}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 900, letterSpacing: 0.7, textTransform: 'uppercase', color: workspaceTokens.shell.text }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: token.color, fontWeight: 900 }}>{safeProgress}%</Typography>
          </Stack>
          {subtitle && <Typography variant="caption" color={workspaceTokens.shell.textMuted}>{subtitle}</Typography>}
          <Box sx={{ height: 5, borderRadius: 99, bgcolor: token.soft, mt: 0.8, overflow: 'hidden' }}>
            <Box sx={{ width: `${safeProgress}%`, height: '100%', borderRadius: 99, bgcolor: token.color, transition: 'width 220ms ease' }} />
          </Box>
        </Box>
        <IconButton size="small" onClick={onToggle} aria-label={expanded ? 'Comprimi' : 'Espandi'}>
          <ProximityActionIcon name={expanded ? 'CHEVRON_UP' : 'CHEVRON_DOWN'} size={16} />
        </IconButton>
      </Stack>
      <Collapse in={expanded} timeout="auto" unmountOnExit>{children}</Collapse>
    </Box>
  )
}
