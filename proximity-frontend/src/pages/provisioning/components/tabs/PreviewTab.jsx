import { Alert, Stack, Typography } from '@mui/material'
import WorkspaceCard from '../../../../components/workspace/WorkspaceCard'
import WorkspaceStatusPill from '../../../../components/workspace/WorkspaceStatusPill'
import { workspaceTokens } from '../../../../components/workspace/workspaceTokens'

export default function PreviewTab({ version, items = [] }) {
  if (!version) return <Alert severity="info">Nessuna versione selezionata.</Alert>
  return (
    <WorkspaceCard title="Desired Configuration Preview" subtitle="Riepilogo della configurazione che verra risolta e consegnata al runtime">
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Stack>
          <Typography variant="h4" fontWeight={850} color={workspaceTokens.shell.text}>{items.length}</Typography>
          <Typography variant="body2" color={workspaceTokens.shell.textMuted}>elementi di configurazione disponibili</Typography>
        </Stack>
        <WorkspaceStatusPill label={items.length ? 'READY' : 'EMPTY'} tone={items.length ? 'success' : 'neutral'} />
      </Stack>
    </WorkspaceCard>
  )
}
