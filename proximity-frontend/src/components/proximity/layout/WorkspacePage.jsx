import { Box, Stack } from '@mui/material'
import { proximityTokens } from '../../../theme/proximityTokens'

export default function WorkspacePage({ header, kpis, toolbar, children, sx }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: proximityTokens.layout.pageMaxWidth,
        mx: 'auto',
        px: proximityTokens.layout.pagePadding,
        py: 2,
        ...sx,
      }}
    >
      <Stack spacing={proximityTokens.layout.sectionGap}>
        {header}
        {kpis}
        {toolbar}
        {children}
      </Stack>
    </Box>
  )
}
