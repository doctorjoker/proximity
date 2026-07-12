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
      {items.map((step) => (
        <Paper key={step.id || step.step_name} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={1.4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h6" fontWeight={900}>{step.step_name}</Typography>
                <ExecutionStatusChip status={step.status} />
                <Chip size="small" label={formatDuration(step.duration_ms)} variant="outlined" />
              </Stack>
              {step.error_message && <Chip size="small" color="error" label={step.error_message} />}
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Box sx={{ flex: 1 }}>
                <ExecutionJsonViewer title="Input" value={step.input} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <ExecutionJsonViewer title="Output" value={step.output} />
              </Box>
            </Stack>
          </Stack>
        </Paper>
      ))}

      {items.length === 0 && (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography color="text.secondary">Nessuno step workflow disponibile.</Typography>
        </Box>
      )}
    </Stack>
  );
}
