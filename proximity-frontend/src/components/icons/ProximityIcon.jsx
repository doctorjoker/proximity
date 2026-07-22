import { Box, Tooltip } from '@mui/material'
import { getProximityIconConfig } from './proximityIconRegistry'

export default function ProximityIcon({
  domain = 'OTHER',
  size = 44,
  iconSize = 22,
  stroke = 1.8,
  title,
  interactive = false,
  sx,
  ...boxProps
}) {
  const config = getProximityIconConfig(domain)
  const Icon = config.icon

  const icon = (
    <Box
      aria-label={title || config.label}
      role="img"
      {...boxProps}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 3,
        color: config.color,
        bgcolor: config.background,
        border: `1px solid ${config.border}`,
        transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
        ...(interactive && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: `0 8px 20px ${config.background}`,
          },
        }),
        ...sx,
      }}
    >
      <Icon size={iconSize} stroke={stroke} aria-hidden="true" />
    </Box>
  )

  return title ? <Tooltip title={title}>{icon}</Tooltip> : icon
}
