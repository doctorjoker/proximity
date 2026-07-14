import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ExecutionStatusChip from "./ExecutionStatusChip";

function formatDateTime(value) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function dotColor(status) {
  const value = String(status || "").toUpperCase();
  if (value === "FAILED") return "error.main";
  if (value === "RUNNING") return "warning.main";
  if (["COMPLETED", "SUCCESS"].includes(value)) return "success.main";
  return "primary.main";
}

export default function ExecutionTimeline({ items = [] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" fontWeight={900}>Timeline persistente</Typography>
          <Typography variant="body2" color="text.secondary">
            Sequenza unificata di eventi Procedure Runtime e Workflow Engine.
          </Typography>
        </Box>

        <Stack spacing={0}>
          {items.map((item, index) => (
            <Stack key={`${item.type}-${item.timestamp}-${index}`} direction="row" spacing={1.8}>
              <Stack alignItems="center" sx={{ width: 18, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: dotColor(item.status),
                    boxShadow: "0 0 0 4px rgba(30,90,168,0.08)",
                    mt: 0.8,
                    zIndex: 1,
                  }}
                />
                {index < items.length - 1 && (
                  <Box sx={{ width: 2, flex: 1, minHeight: 72, bgcolor: "divider", mt: 0.5 }} />
                )}
              </Stack>

              <Box sx={{ flex: 1, pb: index < items.length - 1 ? 2.4 : 0 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={900}>{item.title || item.type}</Typography>
                    <ExecutionStatusChip status={item.status} />
                    {item.type && <Chip size="small" label={item.type} variant="outlined" sx={{ fontFamily: "monospace" }} />}
                  </Stack>
                  <Chip size="small" label={formatDateTime(item.timestamp)} variant="outlined" />
                </Stack>

                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>
                    {item.description}
                  </Typography>
                )}

                {item.metadata?.duration_ms !== undefined && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: "block" }}>
                    Durata: {item.metadata.duration_ms} ms
                    {item.metadata.handler_name ? ` · Handler: ${item.metadata.handler_name}` : ""}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}

          {items.length === 0 && (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography fontWeight={850}>Nessun evento disponibile</Typography>
              <Typography variant="body2" color="text.secondary">
                La timeline verrà popolata durante l'esecuzione.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
