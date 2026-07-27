import { useState } from 'react'
import {
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { WorkspaceHeader, WorkspaceToolbar } from '../../../components/workspace'
import ProximityActionIcon from '../../../components/icons/ProximityActionIcon'

export default function ProfileHeader({
  profile,
  version,
  onMenuClick,
  onNew,
  onSave,
  onCreateVersion,
  onPublish,
  onArchive,
  onDelete,
  saveDisabled,
  createVersionDisabled,
  publishDisabled,
  archiveDisabled,
  deleteDisabled,
  saving = false,
  creatingVersion = false,
  publishing = false,
  archiving = false,
  deleting = false,
}) {
  const [actionsAnchor, setActionsAnchor] = useState(null)

  const title = profile?.name || profile?.profile_name || profile?.profile_code || 'Provisioning Profiles'
  const status = version?.status || profile?.status || 'Nessuna selezione'
  const subtitle = profile
    ? 'Profilo di provisioning e configurazione desiderata del servizio'
    : 'Seleziona un profilo dalla barra laterale'

  const metadata = profile ? [
    { label: 'Codice', value: profile.profile_code },
    { label: 'Versione', value: version?.version || '—' },
    { label: 'Tecnologia', value: profile.technology || '—' },
    { label: 'Procedura', value: version?.procedure_code || '—' },
  ] : []

  const closeActions = () => setActionsAnchor(null)

  const runAction = (handler) => {
    closeActions()
    handler?.()
  }

  const actionsBusy = creatingVersion || archiving || deleting

  return (
    <WorkspaceHeader
      iconDomain="PROVISIONING"
      eyebrow="Proximity Provisioning"
      title={title}
      subtitle={subtitle}
      breadcrumbs={['Proximity', 'Provisioning']}
      metadata={metadata}
      status={status}
      onMenuClick={onMenuClick}
      actions={(
        <WorkspaceToolbar>
          <Button
            size="small"
            variant="text"
            startIcon={<ProximityActionIcon name="ADD" />}
            onClick={onNew}
          >
            Nuovo
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<ProximityActionIcon name="SAVE" />}
            onClick={onSave}
            disabled={!profile || saveDisabled || saving}
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<ProximityActionIcon name="PUBLISH" />}
            onClick={onPublish}
            disabled={publishDisabled || publishing}
          >
            {publishing ? 'Pubblicazione…' : 'Pubblica'}
          </Button>

          <Tooltip title="Altre azioni">
            <span>
              <IconButton
                size="small"
                aria-label="Altre azioni del profilo"
                aria-controls={actionsAnchor ? 'provisioning-profile-actions' : undefined}
                aria-haspopup="true"
                aria-expanded={actionsAnchor ? 'true' : undefined}
                onClick={(event) => setActionsAnchor(event.currentTarget)}
                disabled={!profile || actionsBusy}
                sx={{
                  width: 34,
                  height: 34,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                ⋮
              </IconButton>
            </span>
          </Tooltip>

          <Menu
            id="provisioning-profile-actions"
            anchorEl={actionsAnchor}
            open={Boolean(actionsAnchor)}
            onClose={closeActions}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 230, mt: 0.75 } } }}
          >
            <MenuItem
              onClick={() => runAction(onCreateVersion)}
              disabled={!profile || createVersionDisabled || creatingVersion}
            >
              <ListItemIcon>
                <ProximityActionIcon name="ADD" size={18} />
              </ListItemIcon>
              <ListItemText>
                {creatingVersion ? 'Creazione versione…' : 'Nuova versione'}
              </ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => runAction(onArchive)}
              disabled={archiveDisabled || archiving}
            >
              <ListItemIcon>
                <ProximityActionIcon name="ARCHIVE" size={18} />
              </ListItemIcon>
              <ListItemText>
                {archiving ? 'Archiviazione…' : 'Archivia versione'}
              </ListItemText>
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => runAction(onDelete)}
              disabled={!profile || deleteDisabled || deleting}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <ProximityActionIcon name="DELETE" size={18} />
              </ListItemIcon>
              <ListItemText>
                {deleting ? 'Eliminazione…' : 'Elimina profilo'}
              </ListItemText>
            </MenuItem>
          </Menu>
        </WorkspaceToolbar>
      )}
    />
  )
}
