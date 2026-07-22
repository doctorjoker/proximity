import { Box, Button, Stack, Typography } from '@mui/material'

export default function TableEmptyState({ icon, title = 'Nessun elemento', description, actionLabel, onAction }) {
  return (
    <Box sx={{ py: 8, px: 2 }}>
      <Stack alignItems="center" spacing={1.25} textAlign="center">
        {icon}
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            {description}
          </Typography>
        ) : null}
        {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Box>
  )
}
