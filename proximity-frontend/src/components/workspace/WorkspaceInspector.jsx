import { Box } from '@mui/material'
import { workspaceTokens } from './workspaceTokens'

export default function WorkspaceInspector({ children, width = 320, sx }) {
  return <Box sx={{ width, minWidth: width, borderLeft: `1px solid ${workspaceTokens.shell.border}`, bgcolor: workspaceTokens.shell.surfaceMuted, overflowY: 'auto', ...sx }}>{children}</Box>
}
