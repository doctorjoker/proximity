import { useEffect, useState } from "react";
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
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExecutionOverview from "./ExecutionOverview";
import ExecutionTimeline from "./ExecutionTimeline";
import ExecutionEvents from "./ExecutionEvents";
import ExecutionSteps from "./ExecutionSteps";
import ExecutionJsonViewer from "./ExecutionJsonViewer";
import ExecutionStatusChip from "./ExecutionStatusChip";
import {
  getExecution,
  getExecutionEvents,
  getExecutionSteps,
  getExecutionTimeline,
} from "../../../../services/executionService";

export default function ExecutionDrawer({ open, execution, onClose }) {
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [events, setEvents] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!open || !execution?.execution_code) return;
      setLoading(true);
      setError(null);
      setTab(0);

      try {
        const [detailPayload, timelinePayload, eventsPayload, stepsPayload] = await Promise.all([
          getExecution(execution.execution_code),
          getExecutionTimeline(execution.execution_code),
          getExecutionEvents(execution.execution_code),
          getExecutionSteps(execution.execution_code),
        ]);

        if (!active) return;
        setDetail(detailPayload.item || execution);
        setTimeline(Array.isArray(timelinePayload.items) ? timelinePayload.items : []);
        setEvents(Array.isArray(eventsPayload.items) ? eventsPayload.items : []);
        setSteps(Array.isArray(stepsPayload.items) ? stepsPayload.items : []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Errore caricamento dettaglio esecuzione.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [open, execution?.execution_code]);

  const current = detail || execution;
  const effectiveStatus = current?.workflow_record?.status || current?.workflow_engine_status || current?.status;
  const procedureName = current?.procedure_name || current?.procedure_code || "Procedura";

  const tabContent = [
    <ExecutionOverview key="overview" execution={current} />,
    <ExecutionTimeline key="timeline" items={timeline} />,
    <ExecutionEvents key="events" items={events} />,
    <ExecutionSteps key="steps" items={steps} />,
    <Stack key="json" spacing={2}>
      <ExecutionJsonViewer title="Context JSON" value={current?.context_json} />
      <ExecutionJsonViewer title="Input Payload" value={current?.input_payload} />
      <ExecutionJsonViewer title="Output Payload" value={current?.output_payload} />
      <ExecutionJsonViewer title="Result JSON" value={current?.result_json} />
      <ExecutionJsonViewer title="Workflow Record" value={current?.workflow_record} />
    </Stack>,
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", md: 760, xl: 820 } } }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ px: 2.5, py: 2 }}>
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={900} lineHeight={1.2}>
              Execution Monitor
            </Typography>
            <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5" fontWeight={950}>{current?.execution_code || "Execution"}</Typography>
              <ExecutionStatusChip status={effectiveStatus} />
            </Stack>
            <Typography variant="body2" fontWeight={800} noWrap>{procedureName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Workflow {current?.workflow_code || "n/d"} · Versione {current?.procedure_version || "n/d"}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} aria-label="Chiudi dettaglio"><CloseIcon /></IconButton>
        </Stack>
        <Divider />

        <Box sx={{ px: 2 }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" />
            <Tab label="Timeline" />
            <Tab label="Events" />
            <Tab label="Steps" />
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
