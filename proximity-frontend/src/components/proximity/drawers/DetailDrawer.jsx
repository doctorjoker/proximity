import CloseIcon from '@mui/icons-material/Close'
import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function DetailDrawer({ open, onClose, title, subtitle, actions, children, width, sx }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width || proximityTokens.layout.drawerWidth },
          maxWidth: '100vw',
          boxShadow: proximityTokens.shadow.drawer,
          ...sx,
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>{title}</Typography>
          {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
        </Box>
        {actions}
        <IconButton onClick={onClose} aria-label="Chiudi pannello">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>{children}</Box>
    </Drawer>
  )
}
