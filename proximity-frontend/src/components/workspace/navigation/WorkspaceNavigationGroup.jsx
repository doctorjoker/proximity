import { Box, Collapse, Stack, Typography } from '@mui/material'
import WorkspaceNavigationBadge from './WorkspaceNavigationBadge'
import WorkspaceNavigationProgress from './WorkspaceNavigationProgress'

export default function WorkspaceNavigationGroup({
  title,
  subtitle,
  icon,
  color = '#2563eb',
  softColor = '#eff6ff',
  expanded = true,
  onToggle,
  progress,
  count,
  sticky = false,
  children,
}) {
  return (
    <Box role="group" sx={{ mb: 1, border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#fff' }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle?.() } }}
        sx={{ px: 1.25, py: 1.15, cursor: 'pointer', bgcolor: softColor, borderLeft: `4px solid ${color}`, position: sticky ? 'sticky' : 'relative', top: sticky ? 0 : 'auto', zIndex: sticky ? 2 : 'auto', outline: 'none', '&:focus-visible': { boxShadow: 'inset 0 0 0 2px #2563eb' } }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon && <Box sx={{ display: 'flex', color }}>{icon}</Box>}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12, letterSpacing: 0.45, fontWeight: 950, color: '#1e293b', textTransform: 'uppercase' }}>{title}</Typography>
            {subtitle && <Typography noWrap variant="caption" sx={{ color: '#64748b' }}>{subtitle}</Typography>}
          </Box>
          {count !== undefined && <WorkspaceNavigationBadge>{count}</WorkspaceNavigationBadge>}
          <Typography component="span" aria-hidden="true" sx={{ color: '#64748b', fontWeight: 900, fontSize: 15, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }}>›</Typography>
        </Stack>
        {progress !== undefined && <Box sx={{ mt: 1 }}><WorkspaceNavigationProgress value={progress} color={color} /></Box>}
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ py: 0.75 }}>{children}</Box>
      </Collapse>
    </Box>
  )
}
