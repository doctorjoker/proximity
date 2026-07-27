import { Menu, MenuItem } from '@mui/material'
export default function WorkspaceNavigationContextMenu({ anchorPosition, open, actions = [], onClose }) {
  return <Menu open={open} onClose={onClose} anchorReference="anchorPosition" anchorPosition={anchorPosition || undefined}>{actions.filter((action) => !action.hidden).map((action) => <MenuItem key={action.id || action.label} disabled={action.disabled} onClick={() => { action.onClick?.(); onClose?.() }}>{action.label}</MenuItem>)}</Menu>
}
