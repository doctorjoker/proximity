import { Box, Card, CardContent, Chip, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import { formatDuration, getDiagnosticTone, getResourceTone, safeNumber } from "./diagnosticsUtils";

const Metric = ({ label, value, progress, helper }) => {
  const tone = getResourceTone(progress);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={900}>{label}</Typography>
        <Typography variant="h5" fontWeight={950} sx={{ mt: 0.5 }}>{value}</Typography>
        {progress !== undefined && progress !== null && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, Number(progress) || 0))}
            sx={{ mt: 1.5, borderRadius: 99, height: 7, "& .MuiLinearProgress-bar": { backgroundColor: tone.color } }}
          />
        )}
        {helper && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>{helper}</Typography>}
      </CardContent>
    </Card>
  );
};

export default function DiagnosticsHealthPanel({ diagnostics }) {
  const tone = getDiagnosticTone(diagnostics);
  if (!diagnostics) return <Typography color="text.secondary">Diagnostica non disponibile per questo dispositivo.</Typography>;
  const score = safeNumber(diagnostics.health_score, 0);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress variant="determinate" value={100} size={92} thickness={5} sx={{ color: "rgba(148,163,184,0.22)" }} />
            <CircularProgress variant="determinate" value={score} size={92} thickness={5} sx={{ color: tone.accent, position: "absolute", left: 0 }} />
            <Box sx={{ inset: 0, position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="h5" fontWeight={950}>{score}</Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={950}>{tone.label}</Typography>
            <Typography color="text.secondary">Health score corrente su 100</Typography>
          </Box>
        </Stack>
        <Stack spacing={1} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
          <Chip label={diagnostics.status || tone.label} color={tone.color} sx={{ fontWeight: 900 }} />
          <Chip label={`Rischio ${diagnostics.risk_level || "N/D"}`} variant="outlined" sx={{ fontWeight: 900 }} />
        </Stack>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
        <Metric label="CPU" value={`${diagnostics.cpu_usage_percent ?? "N/D"}%`} progress={diagnostics.cpu_usage_percent} helper="Utilizzo corrente" />
        <Metric label="Memoria utilizzata" value={`${diagnostics.memory_used_percent ?? "N/D"}%`} progress={diagnostics.memory_used_percent} helper="Soglia critica 80%" />
        <Metric label="Memoria libera" value={`${diagnostics.memory_free_percent ?? "N/D"}%`} progress={100 - safeNumber(diagnostics.memory_free_percent, 100)} helper="Disponibilità corrente" />
        <Metric label="Uptime" value={formatDuration(diagnostics.uptime_seconds)} helper="Continuità operativa CPE" />
      </Box>
    </Stack>
  );
}
