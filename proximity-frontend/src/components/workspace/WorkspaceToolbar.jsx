import { Stack } from '@mui/material'

export default function WorkspaceToolbar({ children, sx }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={sx}>
      {children}
    </Stack>
  )
}
