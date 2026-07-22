import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DevicesIcon from '@mui/icons-material/Devices';
import ErrorIcon from '@mui/icons-material/Error';
import GroupsIcon from '@mui/icons-material/Groups';
import MemoryIcon from '@mui/icons-material/Memory';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import AttentionPanel from '../components/dashboard/AttentionPanel';
import PlatformHealthCard from '../components/dashboard/PlatformHealthCard';
import QuickActions from '../components/dashboard/QuickActions';
import RecentExecutions from '../components/dashboard/RecentExecutions';
import {
  KpiCard,
  KpiGrid,
  WorkspacePage,
  WorkspaceSection,
} from '../components/proximity';
import { loadControlCenter } from '../services/controlCenterService';

function statusOf(item) {
  return String(item.workflow_record?.status || item.workflow_engine_status || item.status || '').toUpperCase();
}

export default function ProximityControlCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState({ executions: [], procedures: [], devices: [], firmwareJobs: [], errors: {}, health: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const result = await loadControlCenter();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message || 'Errore caricamento Control Center.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const summary = useMemo(() => {
    const executions = data.executions || [];
    return {
      activeProcedures: (data.procedures || []).filter((item) => ['ACTIVE', 'PUBLISHED'].includes(String(item.status || '').toUpperCase())).length,
      running: executions.filter((item) => ['RUNNING', 'QUEUED', 'RETRYING'].includes(statusOf(item))).length,
      failed: executions.filter((item) => ['FAILED', 'CANCELLED'].includes(statusOf(item))).length,
      devices: (data.devices || []).length,
      firmwareJobs: (data.firmwareJobs || []).filter((item) => !['COMPLETED', 'SUCCESS'].includes(String(item.status || '').toUpperCase())).length,
    };
  }, [data]);

  return (
    <AppLayout>
      <WorkspacePage spacing={2.4}>
        <PlatformHealthCard health={data.health} errors={data.errors} />
        <QuickActions />

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <>
            <WorkspaceSection
              eyebrow="Automation"
              title="Procedure e Runtime"
              description="Stato operativo del motore, esecuzioni recenti e criticità."
              action={
                <Button startIcon={<RefreshIcon />} onClick={() => load()} sx={{ textTransform: 'none', fontWeight: 800 }}>
                  Aggiorna
                </Button>
              }
            >
              <KpiGrid>
                <KpiCard label="Procedure attive" value={summary.activeProcedures} helper="Catalogo pubblicato" icon={AccountTreeIcon} actionLabel="Vai alle procedure" onClick={() => navigate('/procedures')} />
                <KpiCard label="In esecuzione" value={summary.running} helper="Queued, running o retry" icon={PlayCircleIcon} tone="cyan" actionLabel="Vai alle esecuzioni" onClick={() => navigate('/procedure-executions')} />
                <KpiCard label="Fallite" value={summary.failed} helper="Richiedono verifica" icon={ErrorIcon} tone={summary.failed ? 'error' : 'success'} actionLabel="Analizza errori" onClick={() => navigate('/procedure-executions')} />
                <KpiCard label="Esecuzioni caricate" value={data.executions.length} helper="Ultime attività runtime" icon={PlayCircleIcon} tone="success" actionLabel="Apri il centro" onClick={() => navigate('/procedure-executions')} />
              </KpiGrid>
            </WorkspaceSection>

            <WorkspaceSection eyebrow="Operations" title="Customer Network Operations" description="Indicatori principali di apparati, clienti e firmware.">
              <KpiGrid>
                <KpiCard label="Customers" value="—" helper="Vista cliente unificata" icon={GroupsIcon} tone="cyan" actionLabel="Vai ai clienti" onClick={() => navigate('/customers')} />
                <KpiCard label="Devices" value={summary.devices} helper="Inventario caricato" icon={DevicesIcon} actionLabel="Vai ai device" onClick={() => navigate('/devices')} />
                <KpiCard label="Firmware jobs aperti" value={summary.firmwareJobs} helper="Job non completati" icon={MemoryIcon} tone={summary.firmwareJobs ? 'warning' : 'success'} actionLabel="Vai al firmware" onClick={() => navigate('/firmware')} />
                <KpiCard label="Diagnostics" value="—" helper="Assurance e diagnostica" icon={ErrorIcon} tone="success" actionLabel="Apri diagnostica" onClick={() => navigate('/diagnostics')} />
              </KpiGrid>
            </WorkspaceSection>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.6fr) minmax(360px, 0.9fr)' }, gap: 2.4 }}>
              <RecentExecutions items={data.executions} />
              <AttentionPanel executions={data.executions} errors={data.errors} />
            </Box>
          </>
        )}
      </WorkspacePage>
    </AppLayout>
  );
}
