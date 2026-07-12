import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ExecutionStatusChip from "./ExecutionStatusChip";

function formatDate(value) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ExecutionEvents({ items = [] }) {
  return (
    <Stack spacing={1.2}>
      {items.map((item) => (
        <Paper key={item.id || `${item.event_type}-${item.event_time}`} variant="outlined" sx={{ p: 1.7, borderRadius: 3 }}>
          <Stack spacing={0.8}>
            <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={900}>{item.title || item.event_type}</Typography>
                <ExecutionStatusChip status={item.event_status} />
                <Chip size="small" label={item.event_type || "EVENT"} variant="outlined" />
              </Stack>
              <Typography variant="caption" color="text.secondary">{formatDate(item.event_time || item.created_at)}</Typography>
            </Stack>
            {item.description && <Typography variant="body2" color="text.secondary">{item.description}</Typography>}
            {item.worker_name && <Typography variant="caption" color="text.secondary">Worker: {item.worker_name}</Typography>}
          </Stack>
        </Paper>
      ))}

      {items.length === 0 && (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography color="text.secondary">Nessun evento workflow disponibile.</Typography>
        </Box>
      )}
    </Stack>
  );
}
