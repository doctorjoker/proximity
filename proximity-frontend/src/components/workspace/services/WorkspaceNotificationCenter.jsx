import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import ProximityIcon from '../../icons/ProximityIcon'
import useWorkspaceServices from './useWorkspaceServices'

const severityDomain = {
  success: 'DIAGNOSTICS',
  warning: 'MAINTENANCE',
  error: 'SECURITY',
  info: 'OTHER',
}

export function WorkspaceNotificationTrigger({ label = 'Notifiche' }) {
  const services = useWorkspaceServices()
  const unread = services.notifications.filter((item) => !item.read).length
  return (
    <IconButton onClick={services.openNotificationCenter} aria-label={label}>
      <Badge badgeContent={unread} color="error" max={99}>
        <ProximityIcon domain="OTHER" size={32} iconSize={17} />
      </Badge>
    </IconButton>
  )
}

export default function WorkspaceNotificationCenter() {
  const services = useWorkspaceServices()
  return (
    <Drawer
      anchor="right"
      open={services.notificationCenterOpen}
      onClose={services.closeNotificationCenter}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Centro notifiche</Typography>
          <Typography variant="body2" color="text.secondary">
            {services.notifications.length} eventi
          </Typography>
        </Box>
        <Button size="small" onClick={services.clearNotifications} disabled={!services.notifications.length}>
          Svuota
        </Button>
      </Stack>
      <Divider />
      <Stack spacing={0}>
        {services.notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Nessuna notifica</Typography>
          </Box>
        ) : services.notifications.map((item) => (
          <Box
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => services.markNotificationRead(item.id)}
            onKeyDown={(event) => event.key === 'Enter' && services.markNotificationRead(item.id)}
            sx={{
              px: 2.5,
              py: 1.75,
              display: 'flex',
              gap: 1.5,
              cursor: 'pointer',
              bgcolor: item.read ? 'transparent' : 'action.hover',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <ProximityIcon domain={severityDomain[item.severity] || 'OTHER'} size={36} iconSize={18} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontWeight={item.read ? 600 : 800}>{item.title}</Typography>
              {item.message && <Typography variant="body2" color="text.secondary">{item.message}</Typography>}
              <Typography variant="caption" color="text.disabled">
                {new Date(item.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Drawer>
  )
}
