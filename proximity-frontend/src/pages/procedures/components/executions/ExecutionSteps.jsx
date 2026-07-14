import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ExecutionJsonViewer from "./ExecutionJsonViewer";
import ExecutionStatusChip from "./ExecutionStatusChip";

function formatDuration(ms) {
  if (ms === null || ms === undefined) return "-";
  return `${ms} ms`;
}

export default function ExecutionSteps({ items = [] }) {
  return (
    <Stack spacing={1.5}>
      {items.map((phase) => {
        const title = phase.phase_name || phase.step_name || phase.phase_key || "Fase runtime";
        const input = phase.input_json ?? phase.input ?? {};
        const output = phase.output_json ?? phase.output ?? {};
        const error = phase.error_json ?? (phase.error_message ? { message: phase.error_message } : {});

        return (
          <Paper key={phase.id || phase.phase_key || title} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1.4}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6" fontWeight={900}>{title}</Typography>
                  <ExecutionStatusChip status={phase.status} />
                  <Chip size="small" label={formatDuration(phase.duration_ms)} variant="outlined" />
                  {phase.handler_name && <Chip size="small" label={phase.handler_name} variant="outlined" sx={{ fontFamily: "monospace" }} />}
                </Stack>
                {phase.phase_order !== undefined && <Chip size="small" label={`Fase ${phase.phase_order}`} />}
              </Stack>

              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <ExecutionJsonViewer title="Input" value={input} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <ExecutionJsonViewer title="Output" value={output} />
                </Box>
              </Stack>

              {error && Object.keys(error).length > 0 && (
                <ExecutionJsonViewer title="Errore" value={error} />
              )}
            </Stack>
          </Paper>
        );
      })}

      {items.length === 0 && (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography color="text.secondary">Nessuna fase runtime persistita.</Typography>
        </Box>
      )}
    </Stack>
  );
}
