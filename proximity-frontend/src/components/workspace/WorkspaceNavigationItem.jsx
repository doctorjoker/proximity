import { ListItemButton, ListItemText } from '@mui/material'
import WorkspaceStatusPill from './WorkspaceStatusPill'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceNavigationItem({ selected, primary, secondary, status, tone, onClick }) {
  return (
    <ListItemButton selected={selected} onClick={onClick} sx={{ mx: 0.75, mb: 0.45, borderRadius: 1.75, py: 0.75, border: '1px solid transparent', '&.Mui-selected': { bgcolor: workspaceTokens.shell.primarySoft, borderColor: 'rgba(37, 99, 235, 0.22)' }, '&.Mui-selected:hover': { bgcolor: workspaceTokens.shell.primarySoft } }}>
      <ListItemText primary={primary} secondary={secondary} primaryTypographyProps={{ fontWeight: 800, fontSize: 13.5, color: workspaceTokens.shell.text }} secondaryTypographyProps={{ fontSize: 10, mt: 0.1, color: workspaceTokens.shell.textMuted }} />
      {status && <WorkspaceStatusPill label={status} tone={tone} compact />}
    </ListItemButton>
  )
}
