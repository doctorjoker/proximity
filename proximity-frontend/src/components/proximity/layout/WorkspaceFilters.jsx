import { Paper, Stack } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function WorkspaceFilters({ children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: proximityTokens.shape.radiusMd,
        ...sx,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
        {children}
      </Stack>
    </Paper>
  )
}
