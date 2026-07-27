import {
  Alert,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import WorkspaceCard from '../../../../components/workspace/WorkspaceCard'
import WorkspaceStatusPill from '../../../../components/workspace/WorkspaceStatusPill'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'

export default function GeneralTab({ profile, version, value, onChange, disabled = false }) {
  if (!profile || !value) {
    return <Alert severity="info">Seleziona un profilo per visualizzarne i dettagli.</Alert>
  }

  const setField = (field) => (event) => {
    const nextValue = field === 'active' ? event.target.checked : event.target.value
    onChange?.({ ...value, [field]: nextValue })
  }

  return (
    <WorkspaceCard
      title="Informazioni generali"
      subtitle="Identità, tecnologia e stato operativo del profilo di provisioning"
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Codice profilo"
            value={profile.profile_code || ''}
            fullWidth
            disabled
            helperText="Il codice non può essere modificato dopo la creazione"
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <TextField
            label="Nome"
            value={value.name || ''}
            onChange={setField('name')}
            fullWidth
            required
            disabled={disabled}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Tecnologia"
            value={value.technology || ''}
            onChange={setField('technology')}
            fullWidth
            required
            disabled={disabled}
            placeholder="FTTH, XGS-PON, FWA..."
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Ambito vendor"
            value={value.vendor_scope || ''}
            onChange={setField('vendor_scope')}
            fullWidth
            disabled={disabled}
            placeholder="Tutti oppure vendor specifico"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={0.8} sx={{ minHeight: 56, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: workspaceTokens.shell.textMuted, fontWeight: 700 }}>
              Stato versione selezionata
            </Typography>
            <WorkspaceStatusPill
              label={version?.status || 'NESSUNA VERSIONE'}
              sx={{ alignSelf: 'flex-start' }}
            />
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descrizione"
            value={value.description || ''}
            onChange={setField('description')}
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={(
              <Switch
                checked={Boolean(value.active)}
                onChange={setField('active')}
                disabled={disabled}
              />
            )}
            label={value.active ? 'Profilo attivo' : 'Profilo disattivato'}
          />
        </Grid>
      </Grid>
    </WorkspaceCard>
  )
}
