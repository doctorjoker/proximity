import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
  KpiCard,
  KpiGrid,
  WorkspacePage,
  WorkspaceSection,
} from "../../components/proximity";
import { ProximityPanel } from "../../components/ui";
import ExecutionToolbar from "./components/executions/ExecutionToolbar";
import ExecutionTable from "./components/executions/ExecutionTable";
import ExecutionDrawer from "./components/executions/ExecutionDrawer";
import { listExecutions } from "../../services/executionService";

function effectiveStatus(item) {
  return String(
    item.workflow_engine_status ||
      item.workflow_record?.status ||
      item.status ||
      "",
  ).toUpperCase();
}

function matchesQuery(item, query) {
  if (!query.trim()) return true;

  const normalizedQuery = query.trim().toLowerCase();
  return [
    item.execution_code,
    item.workflow_code,
    item.workflow_type,
    item.procedure_code,
    item.procedure_version,
    item.requested_by,
    item.current_step,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

export default function ProcedureExecutionCenter() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);

  const loadExecutions = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const payload = await listExecutions({ limit: 200 });
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems(nextItems);
      setSelectedExecution((current) => {
        if (!current) return null;
        return (
          nextItems.find(
            (item) => item.execution_code === current.execution_code,
          ) || current
        );
      });
    } catch (loadError) {
      setError(loadError.message || "Errore caricamento esecuzioni.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = window.setInterval(
      () => loadExecutions({ silent: true }),
      10000,
    );
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const statusMatches =
          status === "ALL" || effectiveStatus(item) === status;
        const modeMatches = mode === "ALL" || item.mode === mode;
        return statusMatches && modeMatches && matchesQuery(item, query);
      }),
    [items, mode, query, status],
  );

  const summary = useMemo(() => {
    const running = items.filter((item) =>
      ["RUNNING", "QUEUED", "RETRYING"].includes(effectiveStatus(item)),
    ).length;
    const completed = items.filter((item) =>
      ["COMPLETED", "SUCCESS"].includes(effectiveStatus(item)),
    ).length;
    const failed = items.filter((item) =>
      ["FAILED", "CANCELLED"].includes(effectiveStatus(item)),
    ).length;
    const terminated = completed + failed;
    const successRate = terminated
      ? `${((completed / terminated) * 100).toFixed(1)}% success rate`
      : "Nessuna esecuzione terminata";

    return {
      total: items.length,
      running,
      completed,
      failed,
      successRate,
    };
  }, [items]);

  return (
    <WorkspacePage spacing={2.4}>
      <WorkspaceSection
        eyebrow="Automation"
        title="Execution Center"
        description="Monitoraggio operativo delle Procedure Automatiche e del runtime."
        action={
          <Button
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            onClick={() => loadExecutions()}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            Aggiorna
          </Button>
        }
      >
        <KpiGrid>
          <KpiCard
            label="Esecuzioni caricate"
            value={summary.total}
            helper="Archivio runtime disponibile"
            icon={AccountTreeIcon}
            actionLabel="Visualizza elenco"
          />
          <KpiCard
            label="In esecuzione"
            value={summary.running}
            helper="Queued, running o retry"
            icon={PlayCircleIcon}
            tone="cyan"
            actionLabel="Filtra attività"
            onClick={() => setStatus("RUNNING")}
          />
          <KpiCard
            label="Fallite"
            value={summary.failed}
            helper="Richiedono verifica"
            icon={ErrorIcon}
            tone={summary.failed ? "error" : "success"}
            actionLabel="Analizza errori"
            onClick={() => setStatus("FAILED")}
          />
          <KpiCard
            label="Completate"
            value={summary.completed}
            helper={summary.successRate}
            icon={CheckCircleIcon}
            tone="success"
            actionLabel="Mostra completate"
            onClick={() => setStatus("COMPLETED")}
          />
        </KpiGrid>
      </WorkspaceSection>

      {error && <Alert severity="error">{error}</Alert>}

      <ProximityPanel
        header={
          <ExecutionToolbar
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={setStatus}
            mode={mode}
            onModeChange={setMode}
            onRefresh={() => loadExecutions()}
            loading={loading}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
          />
        }
      >
        {loading ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <ExecutionTable
            items={filteredItems}
            loading={loading}
            selectedExecution={selectedExecution}
            onSelect={setSelectedExecution}
          />
        )}
      </ProximityPanel>

      <ExecutionDrawer
        open={Boolean(selectedExecution)}
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </WorkspacePage>
  );
}
