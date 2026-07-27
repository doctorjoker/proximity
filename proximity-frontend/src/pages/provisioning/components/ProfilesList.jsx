import { Box, Chip, Stack, Typography } from '@mui/material'
import WorkspaceSidebar from '../../../components/workspace/WorkspaceSidebar'

function normalizeStatus(status) {
  const value = String(status || '').toUpperCase()

  if (value === 'PUBLISHED' || value === 'ACTIVE') {
    return { label: 'Pubblicato', color: 'success' }
  }

  if (value === 'DRAFT') {
    return { label: 'Bozza', color: 'warning' }
  }

  if (value === 'DEPRECATED' || value === 'ARCHIVED') {
    return { label: 'Storico', color: 'default' }
  }

  return {
    label: status || 'Nessuno stato',
    color: 'default',
  }
}

export default function ProfilesList({
  profiles,
  selectedCode,
  onSelect,
  search,
  onSearchChange,
  actions,
}) {
  const items = profiles.map((profile) => {
    const title = profile.name || profile.profile_name || profile.profile_code
    const status = normalizeStatus(profile.status)
    const version = profile.current_version || profile.version

    return {
      key: profile.profile_code,
      primary: (
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography
            variant="body2"
            fontWeight={800}
            noWrap
            title={title}
          >
            {title}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={profile.profile_code}
            sx={{ display: 'block', mt: 0.25 }}
          >
            {profile.profile_code}
          </Typography>
        </Box>
      ),
      secondary: (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 0.75 }}
        >
          {profile.technology && (
            <Chip
              label={profile.technology}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontWeight: 700 }}
            />
          )}

          {version && (
            <Chip
              label={`v${version}`}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontWeight: 700 }}
            />
          )}

          <Chip
            label={status.label}
            size="small"
            color={status.color}
            variant={status.color === 'default' ? 'outlined' : 'filled'}
            sx={{ height: 22, fontWeight: 800 }}
          />
        </Stack>
      ),
    }
  })

  return (
    <WorkspaceSidebar
      title="Provisioning Profiles"
      items={items}
      selectedKey={selectedCode}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      actions={actions}
    />
  )
}
