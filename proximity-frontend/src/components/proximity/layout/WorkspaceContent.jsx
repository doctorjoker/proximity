import { Paper } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function WorkspaceContent({ children, sx, ...props }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        overflow: 'hidden',
        borderRadius: proximityTokens.shape.radiusLg,
        boxShadow: proximityTokens.shadow.panel,
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}
