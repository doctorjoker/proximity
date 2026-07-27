import { Box, Typography } from '@mui/material'
export default function WorkspaceNavigationEmptyState({ title = 'Nessun elemento', description = 'Modifica i criteri di ricerca.' }) {
  return <Box sx={{ p: 3, textAlign: 'center' }}><Typography fontWeight={900} color="#475569">{title}</Typography><Typography variant="caption" color="#94a3b8">{description}</Typography></Box>
}
