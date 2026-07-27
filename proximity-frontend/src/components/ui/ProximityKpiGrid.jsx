import { Box } from '@mui/material'
import { proximityDesignTokens } from '../../theme'

/** Shared responsive grid used by Dashboard and every Workspace KPI group. */
export default function ProximityKpiGrid({ children, columns = 4, sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          xl: `repeat(${columns}, minmax(0, 1fr))`,
        },
        gap: proximityDesignTokens.spacing.workspaceGap,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
