import { Box, Stack, Typography } from '@mui/material'
import ProximityIcon from '../../icons/ProximityIcon'
import useWorkspaceServices from './useWorkspaceServices'

const statusDomain = {
  success: 'DIAGNOSTICS',
  warning: 'MAINTENANCE',
  error: 'SECURITY',
  running: 'PROVISIONING',
  info: 'OTHER',
}

export default function WorkspaceActivityTimeline({ activities, emptyMessage = 'Nessuna attività registrata' }) {
  const services = useWorkspaceServices()
  const items = activities || services.activities

  if (!items.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={0}>
      {items.map((item, index) => (
        <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 1.5, minHeight: 72 }}>
          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <ProximityIcon domain={statusDomain[item.status] || 'OTHER'} size={32} iconSize={16} />
            {index < items.length - 1 && (
              <Box sx={{ position: 'absolute', top: 34, bottom: 0, width: 2, bgcolor: 'divider' }} />
            )}
          </Box>
          <Box sx={{ pb: 2.5 }}>
            <Typography fontWeight={800}>{item.title}</Typography>
            {item.description && (
              <Typography variant="body2" color="text.secondary">{item.description}</Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              {new Date(item.createdAt).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
