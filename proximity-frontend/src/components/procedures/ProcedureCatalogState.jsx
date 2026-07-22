import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'

export function ProcedureCatalogLoading() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, py: 8, borderColor: 'divider' }}>
      <Stack alignItems="center" spacing={1.4}>
        <CircularProgress size={34} />
        <Typography color="text.secondary" fontWeight={850}>Caricamento catalogo procedure...</Typography>
      </Stack>
    </Paper>
  )
}

export function ProcedureCatalogEmpty({ filtered = false, onReset }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 5, textAlign: 'center', borderColor: 'divider' }}>
      <Box sx={{ width: 58, height: 58, borderRadius: 3, mx: 'auto', bgcolor: 'rgba(37,99,235,0.09)', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
        <AccountTreeOutlinedIcon sx={{ fontSize: 31 }} />
      </Box>
      <Typography sx={{ mt: 1.6, fontSize: 20, fontWeight: 950 }}>{filtered ? 'Nessun risultato' : 'Catalogo vuoto'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
        {filtered ? 'Modifica la ricerca o azzera i filtri applicati.' : 'Non sono ancora disponibili procedure automatiche.'}
      </Typography>
      {filtered && <Button onClick={onReset} sx={{ mt: 1.4, textTransform: 'none', fontWeight: 900 }}>Azzera filtri</Button>}
    </Paper>
  )
}

export function ProcedureCatalogError({ message, onRetry }) {
  return (
    <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>Riprova</Button>} sx={{ borderRadius: 3, fontWeight: 800 }}>
      {message || 'Errore durante il caricamento del catalogo.'}
    </Alert>
  )
}
