import { Box, CircularProgress, Stack, Typography } from '@mui/material'

export default function TableLoading({ label = 'Caricamento dati...' }) {
  return (
    <Box sx={{ py: 8 }}>
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress size={30} />
        <Typography color="text.secondary">{label}</Typography>
      </Stack>
    </Box>
  )
}
