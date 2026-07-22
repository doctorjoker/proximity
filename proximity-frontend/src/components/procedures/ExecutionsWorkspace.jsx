import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import WorkspaceMetrics from "./WorkspaceMetrics";
import ExecutionList from "./ExecutionList";
import ExecutionInspector from "./ExecutionInspector";
import { executionProcedureCode, executionStatus, matchesExecutionQuery } from "./executionUtils";
import { getExecution, getExecutionEvents, getExecutionSteps, getExecutionTimeline, listExecutions } from "../../services/executionService";

const STATUS_OPTIONS = [
  ["ALL", "Tutti gli stati"],
  ["RUNNING", "In esecuzione"],
  ["COMPLETED", "Completate"],
  ["FAILED", "Fallite"],
  ["PENDING", "In attesa"],
];

function belongsToProcedure(item, procedureCode) {
  if (!procedureCode) return true;
  const candidate = String(executionProcedureCode(item) || "").toLowerCase();
  const expected = String(procedureCode).toLowerCase();
  return candidate === expected || candidate.includes(expected) || String(item?.procedure_code || "").toLowerCase() === expected;
}

export default function ExecutionsWorkspace({ procedureCode, onOpenExecutionCenter }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [events, setEvents] = useState([]);
  const [steps, setSteps] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await listExecutions({ limit: 200 });
      const allItems = Array.isArray(payload?.items) ? payload.items : [];
      const scoped = allItems.filter((item) => belongsToProcedure(item, procedureCode));
      setItems(scoped);
      setSelected((current) => scoped.find((item) => item.execution_code === current?.execution_code) || scoped[0] || null);
    } catch (loadError) {
      setItems([]);
      setSelected(null);
      setError(loadError?.message || "Errore durante il caricamento delle esecuzioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [procedureCode]);

  useEffect(() => {
    let active = true;
    async function loadDetail() {
      if (!selected?.execution_code) {
        setDetail(null); setTimeline([]); setEvents([]); setSteps([]); return;
      }
      setDetailLoading(true);
      setDetailError("");
      try {
        const [detailPayload, timelinePayload, eventsPayload, stepsPayload] = await Promise.all([
          getExecution(selected.execution_code),
          getExecutionTimeline(selected.execution_code),
          getExecutionEvents(selected.execution_code),
          getExecutionSteps(selected.execution_code),
        ]);
        if (!active) return;
        setDetail(detailPayload?.item || selected);
        setTimeline(Array.isArray(timelinePayload?.items) ? timelinePayload.items : []);
        setEvents(Array.isArray(eventsPayload?.items) ? eventsPayload.items : []);
        setSteps(Array.isArray(stepsPayload?.items) ? stepsPayload.items : []);
      } catch (loadError) {
        if (!active) return;
        setDetail(selected);
        setTimeline([]); setEvents([]); setSteps([]);
        setDetailError(loadError?.message || "Dettaglio esecuzione non disponibile.");
      } finally {
        if (active) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => { active = false; };
  }, [selected?.execution_code]);

  const filtered = useMemo(() => items.filter((item) => {
    const statusOk = status === "ALL" || executionStatus(item) === status || (status === "COMPLETED" && ["SUCCESS", "SUCCEEDED", "DONE"].includes(executionStatus(item)));
    return statusOk && matchesExecutionQuery(item, query);
  }), [items, query, status]);

  const running = items.filter((item) => ["RUNNING", "IN_PROGRESS", "STARTED", "EXECUTING"].includes(executionStatus(item))).length;
  const failed = items.filter((item) => ["FAILED", "ERROR", "TIMEOUT"].includes(executionStatus(item))).length;
  const completed = items.filter((item) => ["COMPLETED", "SUCCESS", "SUCCEEDED", "DONE"].includes(executionStatus(item))).length;

  return (
    <Stack spacing={1.25}>
      <WorkspaceMetrics accent="#0ea5e9" items={[
        { label: "Totali", value: items.length },
        { label: "In esecuzione", value: running },
        { label: "Completate", value: completed },
        { label: "Fallite", value: failed },
      ]} />

      <Box sx={{ position: "sticky", top: -18, zIndex: 4, p: 1, mx: -1, bgcolor: "#f6f8fb" }}>
        <Box sx={{ p: 1, border: "1px solid #dbe5f0", borderRadius: 2.3, bgcolor: "#fff" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ sm: "center" }}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              fullWidth
              placeholder="Cerca codice, fase, richiedente..."
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 0.8, fontSize: 19, color: "#94a3b8" }} /> }}
            />
            <TextField select size="small" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 155 }}>
              {STATUS_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <Button variant="outlined" startIcon={loading ? <CircularProgress size={15} /> : <RefreshIcon />} disabled={loading} onClick={loadItems} sx={{ minWidth: 110, textTransform: "none", fontWeight: 900 }}>Aggiorna</Button>
          </Stack>
        </Box>
      </Box>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadItems}>Riprova</Button>}>{error}</Alert>}

      {loading && !items.length ? (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}><CircularProgress size={22} /><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Caricamento esecuzioni...</Typography></Stack>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(210px, 0.78fr) minmax(0, 1.22fr)" }, gap: 1.25, alignItems: "start", minWidth: 0 }}>
          <Box sx={{ p: 1.15, border: "1px solid #dbe5f0", borderRadius: 2.4, bgcolor: "#fff", maxHeight: { md: "calc(100vh - 395px)" }, overflowY: "auto", minWidth: 0 }}>
            <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mb: 1 }}><PlayArrowIcon sx={{ fontSize: 18, color: "#0ea5e9" }} /><Typography sx={{ color: "#0f172a", fontWeight: 950 }}>Esecuzioni</Typography><Typography variant="caption" sx={{ ml: "auto", color: "#64748b", fontWeight: 850 }}>{filtered.length}</Typography></Stack>
            <ExecutionList items={filtered} selected={selected} onSelect={setSelected} />
          </Box>
          <ExecutionInspector execution={selected} detail={detail} timeline={timeline} events={events} steps={steps} loading={detailLoading} error={detailError} />
        </Box>
      )}

      <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={onOpenExecutionCenter} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 900 }}>Apri Execution Center</Button>
    </Stack>
  );
}
