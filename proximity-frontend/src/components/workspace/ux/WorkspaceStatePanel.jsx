import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'

export default function WorkspaceStatePanel({
  state = 'empty',
  title,
  description,
  action,
  compact = false,
}) {
  if (state === 'loading') {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: compact ? 3 : 7 }}>
        <CircularProgress size={compact ? 26 : 34} />
        <Typography color="text.secondary">{title || 'Caricamento in corso…'}</Typography>
      </Stack>
    )
  }

  if (state === 'error') {
    return (
      <Alert severity="error" action={action} sx={{ borderRadius: 2.5 }}>
        <Typography fontWeight={800}>{title || 'Operazione non riuscita'}</Typography>
        {description && <Typography variant="body2">{description}</Typography>}
      </Alert>
    )
  }

  return (
    <Box sx={{ py: compact ? 3 : 7, px: 3, textAlign: 'center' }}>
      <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={850}>
        {title || 'Nessun elemento disponibile'}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mt: 0.75, mb: action ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  )
}
