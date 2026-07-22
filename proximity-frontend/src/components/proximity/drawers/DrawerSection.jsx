import { Box, Divider, Stack, Typography } from '@mui/material'

export default function DrawerSection({ title, action, children, divider = true, sx }) {
  return (
    <Box sx={{ ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
        {action}
      </Stack>
      {children}
      {divider ? <Divider sx={{ mt: 2 }} /> : null}
    </Box>
  )
}
