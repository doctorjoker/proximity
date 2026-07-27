import { Box, Stack, Typography } from '@mui/material'
import WorkspaceNavigationBadge from './WorkspaceNavigationBadge'

export default function WorkspaceNavigationItem({
  id,
  primary,
  secondary,
  icon,
  selected = false,
  disabled = false,
  status,
  tone = 'neutral',
  badge,
  onClick,
  onDoubleClick,
  onContextMenu,
  tabIndex = -1,
  itemRef,
  depth = 0,
}) {
  return (
    <Box
      id={id}
      ref={itemRef}
      role="treeitem"
      aria-selected={selected}
      aria-disabled={disabled}
      tabIndex={tabIndex}
      onClick={() => !disabled && onClick?.()}
      onDoubleClick={() => !disabled && onDoubleClick?.()}
      onContextMenu={(event) => { if (!disabled && onContextMenu) { event.preventDefault(); onContextMenu(event) } }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, minHeight: 42,
        pl: 1.25 + depth * 1.5, pr: 1, py: 0.55, mx: 0.75, mb: 0.35,
        borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none',
        opacity: disabled ? 0.55 : 1,
        bgcolor: selected ? '#eff6ff' : 'transparent',
        border: selected ? '1px solid #93c5fd' : '1px solid transparent',
        '&:hover': { bgcolor: disabled ? 'transparent' : selected ? '#eff6ff' : '#f8fafc' },
        '&:focus-visible': { boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.18)' },
      }}
    >
      {icon && <Box sx={{ display: 'flex', alignItems: 'center', color: selected ? '#2563eb' : '#64748b' }}>{icon}</Box>}
      <Stack spacing={0.1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13.5, lineHeight: 1.25, fontWeight: selected ? 900 : 800, color: selected ? '#1d4ed8' : '#334155' }}>{primary}</Typography>
        {secondary && <Typography noWrap variant="caption" sx={{ color: '#94a3b8', lineHeight: 1.15 }}>{secondary}</Typography>}
      </Stack>
      {status && <WorkspaceNavigationBadge tone={tone}>{status}</WorkspaceNavigationBadge>}
      {badge !== undefined && badge !== null && <WorkspaceNavigationBadge>{badge}</WorkspaceNavigationBadge>}
    </Box>
  )
}
