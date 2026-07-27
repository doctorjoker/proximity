import { Button, Stack } from '@mui/material'
import ProximityActionIcon from '../../icons/ProximityActionIcon'

export default function WorkspaceActionBar({ actions = [], dense = false, sx }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={sx}>
      {actions.filter((action) => !action.hidden).map((action) => (
        <Button
          key={action.id || action.label}
          variant={action.variant || (action.primary ? 'contained' : 'outlined')}
          color={action.color || 'primary'}
          size={dense ? 'small' : (action.size || 'medium')}
          disabled={action.disabled}
          onClick={action.onClick}
          startIcon={action.iconName ? <ProximityActionIcon name={action.iconName} /> : undefined}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  )
}
