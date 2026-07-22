import { Box, Stack } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function TableToolbar({ start, end, children, sx }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'center' }}
      spacing={1}
      sx={{
        minHeight: proximityTokens.layout.toolbarMinHeight,
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      <Box>{start || children}</Box>
      {end ? <Box>{end}</Box> : null}
    </Stack>
  )
}
