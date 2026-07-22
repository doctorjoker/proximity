import { Alert, Box, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import WorkspacePanel from "./WorkspacePanel";
import {
  executionCode,
  executionDuration,
  executionFinishedAt,
  executionStartedAt,
  executionStatus,
  executionStatusColor,
  executionStatusLabel,
  formatExecutionDate,
  normalizeTimelineItem,
} from "./executionUtils";

function Field({ label, value, mono = false }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>{label}</Typography>
      <Typography sx={{ mt: 0.3, color: "#0f172a", fontWeight: 850, lineHeight: 1.35, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", overflowWrap: "anywhere" }}>{value ?? "-"}</Typography>
    </Box>
  );
}

function JsonPreview({ value }) {
  if (value === undefined || value === null || value === "") return <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 750 }}>Nessun dato runtime disponibile.</Typography>;
  let text;
  try { text = typeof value === "string" ? value : JSON.stringify(value, null, 2); } catch { text = String(value); }
  return <Box component="pre" sx={{ m: 0, p: 1.2, maxHeight: 210, overflow: "auto", borderRadius: 1.8, bgcolor: "#0f172a", color: "#e2e8f0", fontSize: 11.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{text}</Box>;
}

export default function ExecutionInspector({ execution, detail, timeline, events, steps, loading, error }) {
  if (!execution) {
    return <Box sx={{ p: 3, border: "1px dashed #cbd5e1", borderRadius: 2.4, bgcolor: "#f8fafc", textAlign: "center" }}><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Seleziona un'esecuzione per visualizzare avanzamento, runtime e log.</Typography></Box>;
  }

  const current = detail || execution;
  const status = executionStatus(current);
  const timelineItems = (timeline.length ? timeline : events.length ? events : steps).map(normalizeTimelineItem);
  const runtimeValue = current?.context_json || current?.context || current?.input_payload || current?.result_json;

  return (
    <Stack spacing={1.15}>
      {error && <Alert severity="error">{error}</Alert>}
      <WorkspacePanel title="Esecuzione" icon={FactCheckOutlinedIcon} accent="#0ea5e9">
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Caricamento dettaglio...</Typography></Stack>
        ) : (
          <Stack spacing={1.3}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#0f172a", fontSize: 17, fontWeight: 950, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>{executionCode(current)}</Typography>
                <Typography variant="body2" sx={{ mt: 0.4, color: "#64748b", fontWeight: 700 }}>{current?.current_step || current?.workflow_record?.current_step || "Nessuna fase corrente esposta"}</Typography>
              </Box>
              <Chip label={executionStatusLabel(status)} color={executionStatusColor(status)} variant="outlined" size="small" sx={{ fontWeight: 900, bgcolor: "#fff" }} />
            </Stack>
            <Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.3 }}>
              <Field label="Versione" value={current?.procedure_version || current?.version} />
              <Field label="Modalità" value={current?.mode || current?.execution_mode} />
              <Field label="Avvio" value={formatExecutionDate(executionStartedAt(current))} />
              <Field label="Fine" value={formatExecutionDate(executionFinishedAt(current))} />
              <Field label="Durata" value={executionDuration(current)} />
              <Field label="Richiesta da" value={current?.requested_by || current?.created_by} />
            </Box>
            {(current?.error_message || current?.last_error) && <Alert severity="error">{current.error_message || current.last_error}</Alert>}
          </Stack>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Timeline operativa" icon={HistoryOutlinedIcon} accent="#0ea5e9">
        {timelineItems.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 750 }}>Nessun evento di timeline disponibile.</Typography>
        ) : (
          <Stack spacing={1}>
            {timelineItems.slice(0, 20).map((item, index) => (
              <Box key={item.key} sx={{ position: "relative", pl: 2.7 }}>
                {index < timelineItems.length - 1 && <Box sx={{ position: "absolute", left: 6, top: 16, bottom: -12, width: 2, bgcolor: "#dbe5f0" }} />}
                <Box sx={{ position: "absolute", left: 1, top: 5, width: 12, height: 12, borderRadius: "50%", bgcolor: "#0ea5e9", border: "3px solid #e0f2fe" }} />
                <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: 13.5 }}>{item.title}</Typography>
                {item.description && <Typography variant="body2" sx={{ mt: 0.25, color: "#64748b", lineHeight: 1.45 }}>{item.description}</Typography>}
                <Typography variant="caption" sx={{ mt: 0.25, display: "block", color: "#94a3b8", fontWeight: 750 }}>{formatExecutionDate(item.timestamp)}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Runtime" icon={DataObjectOutlinedIcon} accent="#0ea5e9">
        <JsonPreview value={runtimeValue} />
      </WorkspacePanel>
    </Stack>
  );
}
