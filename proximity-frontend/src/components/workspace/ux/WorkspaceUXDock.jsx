import { Badge, Button, Paper, Stack, Tooltip } from '@mui/material'
import ProximityIcon from '../../icons/ProximityIcon'
import { useWorkspaceServices } from '../services'

export default function WorkspaceUXDock() {
  const services = useWorkspaceServices()
  const unread = services.notifications.filter((item) => !item.read).length

  return (
    <Paper
      elevation={8}
      aria-label="Servizi rapidi workspace"
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 20 },
        bottom: { xs: 12, md: 18 },
        zIndex: (theme) => theme.zIndex.modal - 1,
        borderRadius: 999,
        px: 0.75,
        py: 0.75,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Tooltip title="Command Palette · Ctrl/Cmd + K">
          <Button
            size="small"
            onClick={services.openCommandPalette}
            startIcon={<ProximityIcon domain="WORKFLOW" size={28} iconSize={15} />}
            sx={{ borderRadius: 999, px: 1.25, minWidth: 0, fontWeight: 800 }}
          >
            Comandi
          </Button>
        </Tooltip>
        <Tooltip title="Centro notifiche">
          <Button
            size="small"
            onClick={services.openNotificationCenter}
            startIcon={(
              <Badge badgeContent={unread} color="error" max={99}>
                <ProximityIcon domain="OTHER" size={28} iconSize={15} />
              </Badge>
            )}
            sx={{ borderRadius: 999, px: 1.25, minWidth: 0, fontWeight: 800 }}
          >
            Notifiche
          </Button>
        </Tooltip>
      </Stack>
    </Paper>
  )
}
