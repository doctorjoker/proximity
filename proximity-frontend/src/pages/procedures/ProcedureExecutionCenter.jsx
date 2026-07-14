import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { Alert, Box, CircularProgress, Paper, Stack } from "@mui/material";
import ExecutionToolbar from "./components/executions/ExecutionToolbar";
import ExecutionTable from "./components/executions/ExecutionTable";
import ExecutionDrawer from "./components/executions/ExecutionDrawer";
import { listExecutions } from "../../services/executionService";

function effectiveStatus(item) {
  return item.workflow_engine_status || item.workflow_record?.status || item.status || "";
}

function matchesQuery(item, query) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return [
    item.execution_code,
    item.workflow_code,
    item.workflow_type,
    item.procedure_code,
    item.procedure_version,
    item.requested_by,
    item.current_step,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
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
        return nextItems.find((item) => item.execution_code === current.execution_code) || current;
      });
    } catch (err) {
      setError(err.message || "Errore caricamento esecuzioni.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { loadExecutions(); }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => loadExecutions({ silent: true }), 10000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const statusOk = status === "ALL" || effectiveStatus(item) === status;
    const modeOk = mode === "ALL" || item.mode === mode;
    return statusOk && modeOk && matchesQuery(item, query);
  }), [items, mode, query, status]);

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1560, mx: "auto" }}>
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid", borderColor: "divider", background: "linear-gradient(135deg, rgba(30,90,168,0.10), rgba(255,122,0,0.08))" }}>
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
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 8 }}><CircularProgress /></Stack>
          ) : (
            <ExecutionTable items={filteredItems} loading={loading} onSelect={setSelectedExecution} />
          )}
        </Stack>

        <ExecutionDrawer open={Boolean(selectedExecution)} execution={selectedExecution} onClose={() => setSelectedExecution(null)} />
      </Box>
    </AppLayout>
  );
}
