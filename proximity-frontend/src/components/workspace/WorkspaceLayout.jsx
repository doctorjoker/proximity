import { Box, Drawer, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { workspaceTokens } from './workspaceTokens'

const SIDEBAR_WIDTH = 304

export default function WorkspaceLayout({ sidebar, header, metrics, tabs, children, footer, mobileOpen = false, onMobileClose }) {
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const hasSidebar = Boolean(sidebar)
  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)', bgcolor: workspaceTokens.shell.background }}>
      {hasSidebar && (desktop ? <Box sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: `1px solid ${workspaceTokens.shell.border}`, bgcolor: workspaceTokens.shell.surface }}>{sidebar}</Box> : <Drawer open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}>{sidebar}</Drawer>)}
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {header}
        {metrics && <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1.5, bgcolor: workspaceTokens.shell.background }}>{metrics}</Box>}
        {tabs}
        <Box component="main" sx={{ p: { xs: 1.5, md: 2.5 }, flex: 1, overflow: 'auto', bgcolor: workspaceTokens.shell.background }}>{children}</Box>
        {footer}
      </Box>
    </Box>
  )
}
export { SIDEBAR_WIDTH }
