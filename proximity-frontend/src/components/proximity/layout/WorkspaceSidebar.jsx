import { Paper } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function WorkspaceSidebar({ children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        minWidth: 0,
        borderRadius: proximityTokens.shape.radiusLg,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}
