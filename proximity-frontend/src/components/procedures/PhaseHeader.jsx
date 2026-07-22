import { Box, Chip, Stack, Typography } from "@mui/material";

function statusLabel(status) {
  const normalized = String(status || "").toUpperCase();
  if (["READY", "ACTIVE", "ENABLED"].includes(normalized)) return "Pronta";
  if (["DRAFT", "BOZZA"].includes(normalized)) return "Bozza";
  if (["DISABLED", "INACTIVE"].includes(normalized)) return "Disabilitata";
  return status || "n/d";
}

export default function PhaseHeader({ phase }) {
  if (!phase) return null;

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.4}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.65 }}>
          Fase {phase.order}
        </Typography>
        <Typography sx={{ mt: 0.35, color: "#0f172a", fontSize: 19, fontWeight: 950, lineHeight: 1.22 }}>
          {phase.name}
        </Typography>
        <Typography variant="caption" sx={{ mt: 0.55, display: "block", color: "#64748b", fontWeight: 750, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>
          {phase.action}
        </Typography>
      </Box>
      <Chip label={statusLabel(phase.status)} size="small" variant="outlined" sx={{ fontWeight: 900, bgcolor: "#f8fafc" }} />
    </Stack>
  );
}

export { statusLabel as phaseStatusLabel };
