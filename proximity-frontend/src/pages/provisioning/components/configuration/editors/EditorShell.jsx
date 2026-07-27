import { Alert, Box, Button, Divider, FormControlLabel, Grid, Stack, Switch, Typography } from '@mui/material'
import ProximityActionIcon from '../../../../../components/icons/ProximityActionIcon'
import WorkspaceCard from '../../../../../components/workspace/WorkspaceCard'
import WorkspaceSectionHeader from '../../../../../components/workspace/WorkspaceSectionHeader'
import WorkspaceStatusPill from '../../../../../components/workspace/WorkspaceStatusPill'
import { workspaceTokens } from '../../../../../components/workspace/workspaceTokens'
import ConfigurationPreview from '../ConfigurationPreview'

export default function EditorShell({ title, subtitle, children, required, enabled, onRequiredChange, onEnabledChange, onSave, onDelete, saving, canEdit, error, validation, payload, dirty }) {
  const status = validation?.errors?.length ? 'Da correggere' : validation?.warnings?.length ? 'Parziale' : 'Valida'
  const statusTone = validation?.errors?.length ? 'error' : validation?.warnings?.length ? 'warning' : 'success'

  return (
    <Box sx={{ p: { xs: 2, md: 2.5 } }}>
      <WorkspaceSectionHeader title={title} subtitle={subtitle} status={status} statusTone={statusTone} sx={{ mb: 2.25 }} />
      {dirty && <Alert severity="warning" sx={{ mb: 1.5 }}>Sono presenti modifiche non salvate.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {validation?.errors?.map((message) => <Alert key={message} severity="error" sx={{ mb: 1 }}>{message}</Alert>)}
      {validation?.warnings?.map((message) => <Alert key={message} severity="warning" sx={{ mb: 1 }}>{message}</Alert>)}

      <Grid container spacing={2.25}>
        <Grid item xs={12} xl={8}>
          <WorkspaceCard
            title="Parametri desiderati"
            subtitle="Configurazione persistita nella versione del profilo"
            footer={(
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <FormControlLabel control={<Switch checked={required} onChange={(event) => onRequiredChange(event.target.checked)} disabled={!canEdit} />} label="Obbligatorio" />
                  <FormControlLabel control={<Switch checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} disabled={!canEdit} />} label="Abilitato" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  {onDelete && <Button color="error" startIcon={<ProximityActionIcon name="DELETE" />} onClick={onDelete} disabled={!canEdit || saving}>Elimina</Button>}
                  <Button variant="contained" startIcon={<ProximityActionIcon name="SAVE" />} onClick={onSave} disabled={!canEdit || saving || validation?.errors?.length > 0}>
                    {saving ? 'Salvataggio...' : 'Salva configurazione'}
                  </Button>
                </Stack>
              </Stack>
            )}
          >
            <Stack spacing={2.2}>{children}</Stack>
          </WorkspaceCard>
        </Grid>
        <Grid item xs={12} xl={4}>
          <Stack spacing={2}>
            <ConfigurationPreview payload={payload} />
            <WorkspaceCard title="Stato editor" contentSx={{ py: 2 }}>
              <Stack spacing={1.1}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color={workspaceTokens.shell.textMuted}>Versione</Typography><WorkspaceStatusPill label={canEdit ? 'DRAFT' : 'READ ONLY'} tone={canEdit ? 'warning' : 'neutral'} compact /></Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color={workspaceTokens.shell.textMuted}>Obbligatorio</Typography><Typography variant="body2" fontWeight={800}>{required ? 'Si' : 'No'}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color={workspaceTokens.shell.textMuted}>Abilitato</Typography><Typography variant="body2" fontWeight={800}>{enabled ? 'Si' : 'No'}</Typography></Stack>
              </Stack>
            </WorkspaceCard>
          </Stack>
        </Grid>
      </Grid>
      {!canEdit && <Alert severity="info" sx={{ mt: 2 }}>La versione non e in stato DRAFT: la configurazione e disponibile in sola lettura.</Alert>}
    </Box>
  )
}
