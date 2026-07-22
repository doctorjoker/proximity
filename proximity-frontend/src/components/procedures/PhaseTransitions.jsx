import { Box, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/Error";

function Transition({ icon: Icon, label, value, tone }) {
  const success = tone === "success";
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ p: 1.2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: success ? "#f0fdf4" : "#fff7ed" }}>
      <Icon sx={{ mt: 0.15, fontSize: 18, color: success ? "#16a34a" : "#ea580c" }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.25, color: "#0f172a", fontWeight: 850, lineHeight: 1.35, overflowWrap: "anywhere" }}>
          {value || "-"}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function PhaseTransitions({ successTransition, errorTransition }) {
  return (
    <Stack spacing={1}>
      <Transition icon={CheckCircleIcon} label="Successo" value={successTransition} tone="success" />
      <Transition icon={ErrorOutlineIcon} label="Errore" value={errorTransition} tone="error" />
    </Stack>
  );
}
