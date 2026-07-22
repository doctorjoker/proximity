import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Snackbar, Alert } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditNoteIcon from '@mui/icons-material/EditNote'
import HistoryIcon from '@mui/icons-material/History'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useNavigate } from 'react-router-dom'

import AppLayout from '../../components/layout/AppLayout'
import ProcedureCatalogTable, { catalogMetadata } from '../../components/procedures/ProcedureCatalogTable'
import ProcedureCatalogToolbar from '../../components/procedures/ProcedureCatalogToolbar'
import {
  ProcedureCatalogEmpty,
  ProcedureCatalogError,
  ProcedureCatalogLoading,
} from '../../components/procedures/ProcedureCatalogState'
import ProcedureDrawer360 from '../../components/procedures/ProcedureDrawer360'
import {
  KpiCard,
  KpiGrid,
  WorkspacePage,
  WorkspaceSection,
} from '../../components/proximity'
import { listProcedures, listVersions } from '../../services/procedureService'

export default function ProcedureLibrary() {
  const navigate = useNavigate()
  const [procedures, setProcedures] = useState([])
  const [versionsByCode, setVersionsByCode] = useState({})
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  const [trigger, setTrigger] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState({ open: false, message: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await listProcedures()
      const items = Array.isArray(response) ? response : response?.items || []
      const versionEntries = await Promise.all(
        items.map(async (procedure) => {
          const code = procedure?.code || procedure?.definition_code || procedure?.procedure_code
          if (!code) return ['', []]
          try {
            const versionResponse = await listVersions(code)
            return [code, Array.isArray(versionResponse) ? versionResponse : versionResponse?.items || []]
          } catch {
            return [code, []]
          }
        }),
      )
      setProcedures(items)
      setVersionsByCode(Object.fromEntries(versionEntries.filter(([code]) => code)))
      setError('')
    } catch (loadError) {
      setError(loadError?.message || 'Errore caricamento procedure automatiche.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const resetFilters = () => {
    setSearch('')
    setStatus('ALL')
    setCategory('ALL')
    setTrigger('ALL')
  }

  const filteredProcedures = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return procedures.filter((procedure) => {
      const metadata = catalogMetadata(procedure, versionsByCode)
      if (status === 'ACTIVE' && metadata.lifecycle.status !== 'ACTIVE') return false
      if (status === 'DRAFT' && !metadata.lifecycle.draft) return false
      if (status === 'HISTORICAL' && metadata.historicalCount === 0 && metadata.lifecycle.status !== 'DEPRECATED') return false
      if (category !== 'ALL' && metadata.category !== category) return false
      if (trigger !== 'ALL' && metadata.trigger !== trigger) return false
      if (!normalizedSearch) return true
      return [metadata.name, metadata.code, metadata.description, metadata.owner]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [procedures, versionsByCode, search, status, category, trigger])

  const summary = useMemo(() => {
    const metadata = procedures.map((procedure) => catalogMetadata(procedure, versionsByCode))
    return {
      total: metadata.length,
      active: metadata.filter((item) => item.lifecycle.status === 'ACTIVE').length,
      draft: metadata.filter((item) => Boolean(item.lifecycle.draft)).length,
      historical: metadata.filter((item) => item.historicalCount > 0 || item.lifecycle.status === 'DEPRECATED').length,
    }
  }, [procedures, versionsByCode])

  const handleOpenVersions = (procedure) => {
    const code = procedure?.code || procedure?.definition_code || procedure?.procedure_code
    if (code) navigate(`/procedures/${code}/versions`)
  }

  const handleOpenDetail = (procedure, version) => {
    const code = procedure?.code || procedure?.definition_code || procedure?.procedure_code
    if (!code) return
    navigate(version ? `/procedures/${code}/versions/${version}` : `/procedures/${code}`)
  }

  return (
    <AppLayout>
      <WorkspacePage spacing={2.4}>
        <WorkspaceSection
          eyebrow="Automation"
          title="Procedure Automatiche"
          description="Catalogo enterprise dei modelli procedurali, delle versioni e del relativo ciclo di vita."
          action={
            <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading} sx={{ textTransform: 'none', fontWeight: 900 }}>
              Aggiorna
            </Button>
          }
        >
          <KpiGrid>
            <KpiCard label="Procedure totali" value={summary.total} helper="Modelli nel catalogo" icon={AccountTreeIcon} actionLabel="Mostra tutte" onClick={resetFilters} />
            <KpiCard label="Attive" value={summary.active} helper="Versione pubblicata" icon={CheckCircleIcon} tone="success" actionLabel="Filtra attive" onClick={() => setStatus('ACTIVE')} />
            <KpiCard label="Con bozza" value={summary.draft} helper="Modifiche in lavorazione" icon={EditNoteIcon} tone="warning" actionLabel="Filtra bozze" onClick={() => setStatus('DRAFT')} />
            <KpiCard label="Storiche" value={summary.historical} helper="Versioni deprecate" icon={HistoryIcon} tone="cyan" actionLabel="Filtra storiche" onClick={() => setStatus('HISTORICAL')} />
          </KpiGrid>
        </WorkspaceSection>

        <WorkspaceSection
          eyebrow="Catalogo"
          title="Modelli procedurali"
          description="Ricerca, filtra e apri il Drawer360 senza abbandonare il contesto operativo."
        >
          <ProcedureCatalogToolbar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            category={category}
            onCategoryChange={setCategory}
            trigger={trigger}
            onTriggerChange={setTrigger}
            resultCount={filteredProcedures.length}
            totalCount={procedures.length}
            onReset={resetFilters}
            onCreate={() => setNotice({ open: true, message: 'La creazione guidata sarà collegata nel Procedure Designer.' })}
          />
        </WorkspaceSection>

        {loading && <ProcedureCatalogLoading />}
        {!loading && error && <ProcedureCatalogError message={error} onRetry={load} />}
        {!loading && !error && procedures.length === 0 && <ProcedureCatalogEmpty />}
        {!loading && !error && procedures.length > 0 && filteredProcedures.length === 0 && <ProcedureCatalogEmpty filtered onReset={resetFilters} />}
        {!loading && !error && filteredProcedures.length > 0 && (
          <ProcedureCatalogTable
            procedures={filteredProcedures}
            versionsByCode={versionsByCode}
            selectedCode={selectedProcedure?.code || selectedProcedure?.definition_code || selectedProcedure?.procedure_code}
            onSelect={setSelectedProcedure}
            onOpenVersions={handleOpenVersions}
          />
        )}

        <ProcedureDrawer360
          open={Boolean(selectedProcedure)}
          procedure={selectedProcedure}
          versionsByCode={versionsByCode}
          onClose={() => setSelectedProcedure(null)}
          onOpenDetail={handleOpenDetail}
          onOpenVersions={handleOpenVersions}
        />

        <Snackbar open={notice.open} autoHideDuration={3600} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity="info" variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))} sx={{ fontWeight: 800 }}>
            {notice.message}
          </Alert>
        </Snackbar>
      </WorkspacePage>
    </AppLayout>
  )
}
