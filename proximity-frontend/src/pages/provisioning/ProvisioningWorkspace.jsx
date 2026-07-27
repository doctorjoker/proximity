import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { WorkspaceLayout, WorkspaceTabs } from '../../components/workspace'
import { KpiCard, KpiGrid, WorkspacePage, WorkspaceSection } from '../../components/proximity'
import provisioningProfilesApi from '../../services/provisioningProfilesApi'
import ProfilesList from './components/ProfilesList'
import ProfileHeader from './components/ProfileHeader'
import GeneralTab from './components/tabs/GeneralTab'
import ConfigurationTab from './components/tabs/ConfigurationTab'
import ProcedureTab from './components/tabs/ProcedureTab'
import PreviewTab from './components/tabs/PreviewTab'
import HistoryTab from './components/tabs/HistoryTab'
import ProximityActionIcon from '../../components/icons/ProximityActionIcon'
import { getProximityActionIcon, getProximityIconConfig } from '../../components/icons/proximityIconRegistry'

const CatalogIcon = getProximityActionIcon('CATALOG')
const ActiveIcon = getProximityActionIcon('ACTIVE')
const DraftIcon = getProximityActionIcon('DRAFT')
const ProvisioningIcon = getProximityIconConfig('PROVISIONING').icon

const TABS = [
  { value: 'general', label: 'Generale' },
  { value: 'configuration', label: 'Configurazione' },
  { value: 'procedure', label: 'Procedura' },
  { value: 'preview', label: 'Preview' },
  { value: 'history', label: 'Storico' },
]

const EMPTY_NEW_PROFILE = {
  profile_code: '',
  name: '',
  description: '',
  technology: 'FTTH',
  vendor_scope: '',
  active: true,
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.items || payload?.results || []
}

function profileToDraft(profile) {
  if (!profile) return null
  return {
    name: profile.name || profile.profile_name || '',
    description: profile.description || '',
    technology: profile.technology || '',
    vendor_scope: profile.vendor_scope || '',
    active: profile.active !== false,
  }
}

function normalizedDraft(value) {
  return {
    name: String(value?.name || '').trim(),
    description: String(value?.description || '').trim() || null,
    technology: String(value?.technology || '').trim().toUpperCase(),
    vendor_scope: String(value?.vendor_scope || '').trim() || null,
    active: Boolean(value?.active),
  }
}

export default function ProvisioningWorkspace() {
  const [profiles, setProfiles] = useState([])
  const [selectedCode, setSelectedCode] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileDraft, setProfileDraft] = useState(null)
  const [versions, setVersions] = useState([])
  const [version, setVersion] = useState(null)
  const [items, setItems] = useState([])
  const [configurationTypes, setConfigurationTypes] = useState([])
  const [tab, setTab] = useState('general')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [newProfile, setNewProfile] = useState(EMPTY_NEW_PROFILE)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadProfiles = useCallback(async (preferredCode = null, showLoader = true) => {
    if (showLoader) setLoading(true)
    setError('')
    try {
      const data = normalizeList(await provisioningProfilesApi.getProfiles())
      setProfiles(data)
      setSelectedCode((current) => {
        if (preferredCode) return preferredCode
        if (current && data.some((entry) => entry.profile_code === current)) return current
        return data[0]?.profile_code || null
      })
      return data
    } catch (err) {
      setError(err.message || 'Errore durante il caricamento dei profili')
      return []
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfiles()
    provisioningProfilesApi.getConfigurationTypes()
      .then(setConfigurationTypes)
      .catch((err) => setError(err.message || 'Errore durante il caricamento del catalogo configurazioni'))
  }, [loadProfiles])

  useEffect(() => {
    if (!selectedCode) {
      setProfile(null)
      setProfileDraft(null)
      setVersions([])
      setVersion(null)
      setItems([])
      return
    }

    let active = true
    ;(async () => {
      try {
        const [profileData, versionsData] = await Promise.all([
          provisioningProfilesApi.getProfile(selectedCode),
          provisioningProfilesApi.getVersions(selectedCode),
        ])
        if (!active) return
        const normalizedVersions = normalizeList(versionsData)
        const currentVersion = normalizedVersions.find((entry) => entry.is_current)
          || normalizedVersions[0]
          || null
        setProfile(profileData)
        setProfileDraft(profileToDraft(profileData))
        setVersions(normalizedVersions)
        setVersion(currentVersion)
      } catch (err) {
        if (active) setError(err.message || 'Errore durante il caricamento del profilo')
      }
    })()
    return () => { active = false }
  }, [selectedCode])

  useEffect(() => {
    if (!version?.id) {
      setItems([])
      return
    }
    let active = true
    setItemsLoading(true)
    provisioningProfilesApi.getItems(version.id)
      .then((data) => { if (active) setItems(normalizeList(data)) })
      .catch((err) => { if (active) setError(err.message || 'Errore durante il caricamento della configurazione') })
      .finally(() => { if (active) setItemsLoading(false) })
    return () => { active = false }
  }, [version?.id])

  const filteredProfiles = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return profiles
    return profiles.filter((entry) => [entry.profile_code, entry.name, entry.profile_name, entry.technology]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)))
  }, [profiles, search])

  const summary = useMemo(() => {
    const publishedProfiles = profiles.filter((entry) => {
      const status = String(entry?.status || '').toUpperCase()
      return status === 'PUBLISHED' || status === 'ACTIVE'
    }).length
    const draftProfiles = profiles.filter((entry) => String(entry?.status || '').toUpperCase() === 'DRAFT').length
    const publishedVersions = versions.filter((entry) => String(entry?.status || '').toUpperCase() === 'PUBLISHED').length
    const draftVersions = versions.filter((entry) => String(entry?.status || '').toUpperCase() === 'DRAFT').length

    return {
      total: profiles.length,
      published: publishedProfiles || publishedVersions,
      draft: draftProfiles || draftVersions,
      configured: items.length,
    }
  }, [profiles, versions, items])

  const hasProfileChanges = useMemo(() => {
    if (!profile || !profileDraft) return false
    return JSON.stringify(normalizedDraft(profileDraft)) !== JSON.stringify(normalizedDraft(profileToDraft(profile)))
  }, [profile, profileDraft])

  const newProfileValid = Boolean(
    newProfile.profile_code.trim().length >= 2
    && newProfile.name.trim().length >= 2
    && newProfile.technology.trim().length >= 2,
  )

  const openNewProfile = () => {
    setNewProfile(EMPTY_NEW_PROFILE)
    setNewProfileOpen(true)
  }

  const handleCreateProfile = async () => {
    if (!newProfileValid || creating) return
    setCreating(true)
    setError('')
    try {
      const payload = {
        profile_code: newProfile.profile_code.trim().toUpperCase(),
        name: newProfile.name.trim(),
        description: newProfile.description.trim() || null,
        technology: newProfile.technology.trim().toUpperCase(),
        vendor_scope: newProfile.vendor_scope.trim() || null,
        active: Boolean(newProfile.active),
        metadata: {},
      }
      const created = await provisioningProfilesApi.createProfile(payload)
      await provisioningProfilesApi.createVersion(created.profile_code, {
        version: 1,
        notes: 'Versione iniziale',
        metadata: {},
        created_by: 'BACKOFFICE',
      })
      setNewProfileOpen(false)
      setTab('general')
      await loadProfiles(created.profile_code, false)
      setMessage(`Profilo ${created.profile_code} creato con versione 1 in bozza`)
    } catch (err) {
      setError(err.message || 'Creazione del profilo non riuscita')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile?.profile_code || !profileDraft || !hasProfileChanges || saving) return
    const payload = normalizedDraft(profileDraft)
    if (payload.name.length < 2 || payload.technology.length < 2) {
      setError('Nome e tecnologia sono obbligatori')
      return
    }

    setSaving(true)
    setError('')
    try {
      const updated = await provisioningProfilesApi.updateProfile(profile.profile_code, payload)
      setProfile(updated)
      setProfileDraft(profileToDraft(updated))
      setProfiles((current) => current.map((entry) => (
        entry.profile_code === updated.profile_code ? { ...entry, ...updated } : entry
      )))
      setMessage('Profilo salvato correttamente')
    } catch (err) {
      setError(err.message || 'Salvataggio del profilo non riuscito')
    } finally {
      setSaving(false)
    }
  }

  const reloadSelectedProfile = useCallback(async (preferredVersionId = null) => {
    if (!selectedCode) return
    const [profileData, versionsData] = await Promise.all([
      provisioningProfilesApi.getProfile(selectedCode),
      provisioningProfilesApi.getVersions(selectedCode),
    ])
    const normalizedVersions = normalizeList(versionsData)
    const nextVersion = normalizedVersions.find((entry) => entry.id === preferredVersionId)
      || normalizedVersions.find((entry) => entry.is_current)
      || normalizedVersions[0]
      || null
    setProfile(profileData)
    setProfileDraft(profileToDraft(profileData))
    setVersions(normalizedVersions)
    setVersion(nextVersion)
  }, [selectedCode])

  const handleCreateVersion = async () => {
    if (!profile?.profile_code || creatingVersion) return
    setCreatingVersion(true)
    setError('')
    try {
      const nextVersionNumber = versions.reduce(
        (maximum, entry) => Math.max(maximum, Number(entry?.version) || 0),
        0,
      ) + 1
      const created = await provisioningProfilesApi.createVersion(profile.profile_code, {
        version: nextVersionNumber,
        procedure_code: version?.procedure_code || null,
        procedure_version: version?.procedure_version || null,
        notes: `Versione ${nextVersionNumber}`,
        metadata: {},
        created_by: 'BACKOFFICE',
      })
      await reloadSelectedProfile(created?.id || null)
      await loadProfiles(profile.profile_code, false)
      setTab('general')
      setMessage(`Versione ${nextVersionNumber} creata in bozza`)
    } catch (err) {
      setError(err.message || 'Creazione della versione non riuscita')
    } finally {
      setCreatingVersion(false)
    }
  }

  const handleArchiveVersion = async () => {
    if (!version?.id || archiving) return
    setArchiving(true)
    setError('')
    try {
      await provisioningProfilesApi.deprecateVersion(version.id, {
        deprecated_by: 'BACKOFFICE',
      })
      setArchiveDialogOpen(false)
      await reloadSelectedProfile()
      await loadProfiles(selectedCode, false)
      setMessage(`Versione ${version.version} archiviata correttamente`)
    } catch (err) {
      setError(err.message || 'Archiviazione della versione non riuscita')
    } finally {
      setArchiving(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!profile?.profile_code || deleting) return
    const deletedCode = profile.profile_code
    setDeleting(true)
    setError('')
    try {
      await provisioningProfilesApi.deleteProfile(deletedCode)
      setDeleteDialogOpen(false)
      setProfile(null)
      setProfileDraft(null)
      setVersions([])
      setVersion(null)
      setItems([])
      setSelectedCode(null)
      await loadProfiles(null, false)
      setMessage(`Profilo ${deletedCode} eliminato correttamente`)
    } catch (err) {
      setError(err.message || 'Eliminazione del profilo non riuscita')
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    if (!version?.id || publishing) return
    setPublishing(true)
    setError('')
    try {
      const updated = await provisioningProfilesApi.publishVersion(version.id, {
        published_by: 'BACKOFFICE',
      })
      setVersion(updated)
      setVersions((current) => current.map((entry) => (
        entry.id === updated.id ? updated : { ...entry, is_current: false }
      )))
      await loadProfiles(selectedCode, false)
      setMessage('Versione pubblicata correttamente')
    } catch (err) {
      setError(err.message || 'Pubblicazione non riuscita')
    } finally {
      setPublishing(false)
    }
  }

  const refreshItems = async () => {
    if (!version?.id) return
    setItems(normalizeList(await provisioningProfilesApi.getItems(version.id)))
  }

  const handleCreateItem = async (payload) => {
    try {
      await provisioningProfilesApi.createItem(version.id, payload)
      await refreshItems()
      setMessage('Configurazione creata correttamente')
    } catch (err) {
      setError(err.message || 'Creazione della configurazione non riuscita')
      throw err
    }
  }

  const handleUpdateItem = async (itemId, payload) => {
    try {
      const { item_code, ...changes } = payload
      await provisioningProfilesApi.updateItem(itemId, changes)
      await refreshItems()
      setMessage('Configurazione aggiornata correttamente')
    } catch (err) {
      setError(err.message || 'Aggiornamento della configurazione non riuscito')
      throw err
    }
  }

  const handleDeleteItem = async (item) => {
    try {
      await provisioningProfilesApi.deleteItem(item.id)
      await refreshItems()
      setMessage('Configurazione eliminata')
    } catch (err) {
      setError(err.message || 'Eliminazione della configurazione non riuscita')
      throw err
    }
  }

  const content = {
    general: (
      <GeneralTab
        profile={profile}
        version={version}
        value={profileDraft}
        onChange={setProfileDraft}
        disabled={saving}
      />
    ),
    configuration: (
      <ConfigurationTab
        version={version}
        items={items}
        types={configurationTypes}
        loading={itemsLoading}
        onCreateItem={handleCreateItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
    ),
    procedure: <ProcedureTab version={version} />,
    preview: <PreviewTab version={version} items={items} />,
    history: <HistoryTab versions={versions} />,
  }[tab]

  if (loading) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  return (
    <>
      <WorkspacePage>
        <WorkspaceSection
          eyebrow="Operations"
          title="Provisioning"
          description="Catalogo operativo dei profili, delle versioni e delle configurazioni desiderate di servizio."
      >          
           <KpiGrid>
            <KpiCard label="Profili totali" value={summary.total} helper="Modelli nel catalogo" icon={CatalogIcon} tone="primary" />
            <KpiCard label="Pubblicati" value={summary.published} helper="Profili o versioni attive" icon={ActiveIcon} tone="success" />
            <KpiCard label="Con bozza" value={summary.draft} helper="Modifiche in lavorazione" icon={DraftIcon} tone="warning" />
            <KpiCard
              label="Configurazioni"
              value={summary.configured}
              helper={profile ? `Elementi del profilo ${profile.profile_code}` : 'Seleziona un profilo'}
              icon={ProvisioningIcon}
              tone="info"
            />
          </KpiGrid>
        </WorkspaceSection>

        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        <WorkspaceLayout
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          sidebar={(
            <ProfilesList
              profiles={filteredProfiles}
              selectedCode={selectedCode}
              onSelect={(code) => { setSelectedCode(code); setMobileOpen(false) }}
              search={search}
              onSearchChange={setSearch}
              actions={(
                <IconButton size="small" title="Nuovo profilo" onClick={openNewProfile}>
                  <ProximityActionIcon name="ADD" size={17} />
                </IconButton>
              )}
            />
          )}
          header={(
            <ProfileHeader
              profile={profile}
              version={version}
              onMenuClick={() => setMobileOpen(true)}
              onNew={openNewProfile}
              onSave={handleSaveProfile}
              onCreateVersion={handleCreateVersion}
              onPublish={handlePublish}
              onArchive={() => setArchiveDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              saveDisabled={!hasProfileChanges}
              createVersionDisabled={!profile?.profile_code}
              publishDisabled={!version?.id || version?.status !== 'DRAFT' || items.length === 0}
              archiveDisabled={!version?.id || version?.status === 'DEPRECATED'}
              deleteDisabled={!profile?.profile_code}
              saving={saving}
              creatingVersion={creatingVersion}
              publishing={publishing}
              archiving={archiving}
              deleting={deleting}
            />
          )}
          tabs={<WorkspaceTabs value={tab} onChange={setTab} items={TABS} />}
        >
          {content}
        </WorkspaceLayout>
      </WorkspacePage>

      <Dialog
        open={newProfileOpen}
        onClose={creating ? undefined : () => setNewProfileOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuovo profilo di provisioning</DialogTitle>
        <DialogContent>
          <Stack spacing={2.2} sx={{ pt: 1 }}>
            <TextField
              label="Codice profilo"
              value={newProfile.profile_code}
              onChange={(event) => setNewProfile((current) => ({
                ...current,
                profile_code: event.target.value.toUpperCase().replace(/\s+/g, '_'),
              }))}
              required
              fullWidth
              helperText="Codice univoco, ad esempio FTTH_RESIDENTIAL"
              disabled={creating}
            />
            <TextField
              label="Nome"
              value={newProfile.name}
              onChange={(event) => setNewProfile((current) => ({ ...current, name: event.target.value }))}
              required
              fullWidth
              disabled={creating}
            />
            <TextField
              label="Tecnologia"
              value={newProfile.technology}
              onChange={(event) => setNewProfile((current) => ({ ...current, technology: event.target.value }))}
              required
              fullWidth
              placeholder="FTTH, XGS-PON, FWA..."
              disabled={creating}
            />
            <TextField
              label="Ambito vendor"
              value={newProfile.vendor_scope}
              onChange={(event) => setNewProfile((current) => ({ ...current, vendor_scope: event.target.value }))}
              fullWidth
              placeholder="Opzionale"
              disabled={creating}
            />
            <TextField
              label="Descrizione"
              value={newProfile.description}
              onChange={(event) => setNewProfile((current) => ({ ...current, description: event.target.value }))}
              fullWidth
              multiline
              minRows={3}
              disabled={creating}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={newProfile.active}
                  onChange={(event) => setNewProfile((current) => ({ ...current, active: event.target.checked }))}
                  disabled={creating}
                />
              )}
              label="Profilo attivo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewProfileOpen(false)} disabled={creating}>Annulla</Button>
          <Button
            variant="contained"
            startIcon={<ProximityActionIcon name="ADD" />}
            onClick={handleCreateProfile}
            disabled={!newProfileValid || creating}
          >
            {creating ? 'Creazione…' : 'Crea profilo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={archiveDialogOpen}
        onClose={archiving ? undefined : () => setArchiveDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Archivia versione</DialogTitle>
        <DialogContent>
          La versione {version?.version || '—'} del profilo {profile?.profile_code || '—'} verrà impostata come storica.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)} disabled={archiving}>Annulla</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ProximityActionIcon name="ARCHIVE" />}
            onClick={handleArchiveVersion}
            disabled={archiving}
          >
            {archiving ? 'Archiviazione…' : 'Archivia'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={deleting ? undefined : () => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Elimina profilo</DialogTitle>
        <DialogContent>
          Il profilo {profile?.profile_code || '—'} e tutte le sue versioni verranno eliminati. L'operazione è irreversibile.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Annulla</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<ProximityActionIcon name="DELETE" />}
            onClick={handleDeleteProfile}
            disabled={deleting}
          >
            {deleting ? 'Eliminazione…' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3500}
        onClose={() => setMessage('')}
        message={message}
      />
    </>
  )
}
