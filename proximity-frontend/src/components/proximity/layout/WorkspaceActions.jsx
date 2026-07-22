import { Stack } from '@mui/material'

export default function WorkspaceActions({ children, sx }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={sx}>
      {children}
    </Stack>
  )
}
