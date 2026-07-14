import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExecutionOverview from "./ExecutionOverview";
import ExecutionTimeline from "./ExecutionTimeline";
import ExecutionEvents from "./ExecutionEvents";
import ExecutionSteps from "./ExecutionSteps";
import ExecutionJsonViewer from "./ExecutionJsonViewer";
import ExecutionStatusChip from "./ExecutionStatusChip";
import {
  getExecution,
  getExecutionEvents,
  getExecutionPhases,
  getExecutionTimeline,
} from "../../../../services/executionService";

const TERMINAL_STATUSES = new Set(["COMPLETED", "SUCCESS", "FAILED", "CANCELLED", "SKIPPED"]);

function effectiveStatus(item) {
  return item?.workflow_record?.status || item?.workflow_engine_status || item?.status || "";
}

export default function ExecutionDrawer({ open, execution, onClose }) {
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [events, setEvents] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const executionCode = execution?.execution_code;

  const loadDetail = useCallback(async ({ silent = false } = {}) => {
    if (!open || !executionCode) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      const [detailPayload, timelinePayload, phasesPayload, eventsPayload] = await Promise.all([
        getExecution(executionCode),
        getExecutionTimeline(executionCode),
        getExecutionPhases(executionCode),
        getExecutionEvents(executionCode).catch(() => ({ items: [] })),
      ]);

      setDetail(detailPayload.item || detailPayload.execution || execution);
      setTimeline(Array.isArray(timelinePayload.items) ? timelinePayload.items : []);
      setPhases(Array.isArray(phasesPayload.items) ? phasesPayload.items : []);
      setEvents(Array.isArray(eventsPayload.items) ? eventsPayload.items : []);
    } catch (err) {
      setError(err.message || "Errore caricamento dettaglio esecuzione.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [execution, executionCode, open]);

  useEffect(() => {
    if (!open || !executionCode) return undefined;
    setTab(0);
    setDetail(null);
    setTimeline([]);
    setEvents([]);
    setPhases([]);
    loadDetail();
    return undefined;
  }, [executionCode, loadDetail, open]);

  const current = detail || execution;
  const status = String(effectiveStatus(current)).toUpperCase();

  useEffect(() => {
    if (!open || !executionCode || TERMINAL_STATUSES.has(status)) return undefined;
    const timer = window.setInterval(() => loadDetail({ silent: true }), 5000);
    return () => window.clearInterval(timer);
  }, [executionCode, loadDetail, open, status]);

  const tabContent = useMemo(() => [
    <ExecutionOverview key="overview" execution={current} />,
    <ExecutionTimeline key="timeline" items={timeline} />,
    <ExecutionSteps key="phases" items={phases} />,
    <ExecutionEvents key="events" items={events} />,
    <Stack key="json" spacing={2}>
      <ExecutionJsonViewer title="Context JSON" value={current?.context_json} />
      <ExecutionJsonViewer title="Input Payload" value={current?.input_payload} />
      <ExecutionJsonViewer title="Output Payload" value={current?.output_payload} />
      <ExecutionJsonViewer title="Result JSON" value={current?.result_json} />
      <ExecutionJsonViewer title="Workflow Record" value={current?.workflow_record} />
    </Stack>,
  ], [current, events, phases, timeline]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", md: 780, xl: 860 } } }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ p: 2.5 }}>
          <Stack spacing={0.8} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5" fontWeight={950}>Dettaglio esecuzione</Typography>
              <ExecutionStatusChip status={status} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {current?.execution_code || "n/d"} · {current?.workflow_code || "workflow n/d"}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Aggiorna">
              <span>
                <IconButton onClick={() => loadDetail()} disabled={loading || refreshing}>
                  {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Stack>
        </Stack>
        <Divider />

        <Box sx={{ px: 2 }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" />
            <Tab label={`Timeline (${timeline.length})`} />
            <Tab label={`Fasi (${phases.length})`} />
            <Tab label={`Eventi (${events.length})`} />
            <Tab label="JSON" />
          </Tabs>
        </Box>
        <Divider />

        <Box sx={{ p: 2.5, overflow: "auto", flex: 1 }}>
          {loading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
              <CircularProgress />
              <Typography color="text.secondary" fontWeight={800}>Caricamento dettaglio esecuzione...</Typography>
            </Stack>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            tabContent[tab]
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}
