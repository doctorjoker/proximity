import { Box, Chip, Stack, Typography } from "@mui/material";
import { buildDeviceTimeline, formatDate } from "./diagnosticsUtils";

const eventLabels = {
  inform: "ACS",
  refresh: "REFRESH",
  reboot: "REBOOT",
  diagnostics: "CHECK",
};

export default function DiagnosticsTimeline({ device }) {
  const events = buildDeviceTimeline(device);
  if (!events.length) return <Typography color="text.secondary">Nessun evento disponibile nella sessione corrente.</Typography>;

  return (
    <Stack spacing={0}>
      {events.map((event, index) => (
        <Stack key={event.id || `${event.type}-${index}`} direction="row" spacing={2} sx={{ position: "relative", pb: index === events.length - 1 ? 0 : 2.25 }}>
          <Box sx={{ width: 14, display: "flex", justifyContent: "center", position: "relative" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: index === 0 ? "primary.main" : "grey.400", mt: 0.7, zIndex: 1 }} />
            {index < events.length - 1 && <Box sx={{ position: "absolute", top: 14, bottom: -4, width: 2, bgcolor: "divider" }} />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box>
                <Typography fontWeight={900}>{event.title}</Typography>
                <Typography variant="body2" color="text.secondary">{event.detail}</Typography>
              </Box>
              <Chip size="small" variant="outlined" label={eventLabels[event.type] || "EVENTO"} sx={{ fontWeight: 850 }} />
            </Stack>
            <Typography variant="caption" color="text.secondary">{formatDate(event.timestamp)}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
