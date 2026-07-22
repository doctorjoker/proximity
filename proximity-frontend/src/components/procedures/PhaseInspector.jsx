import { Box, Divider, Stack, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PhaseHeader, { phaseStatusLabel } from "./PhaseHeader";
import PhaseIOTable from "./PhaseIOTable";
import PhaseTransitions from "./PhaseTransitions";

function Section({ title, icon: Icon, children, accent = "#ea580c" }) {
  return (
    <Box sx={{ border: "1px solid #dbe5f0", borderRadius: 2.35, bgcolor: "#fff", overflow: "hidden" }}>
      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ px: 1.45, py: 1.1, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <Icon sx={{ fontSize: 17, color: accent }} />
        <Typography sx={{ fontWeight: 950, color: "#0f172a", fontSize: 14 }}>{title}</Typography>
      </Stack>
      <Box sx={{ p: 1.45 }}>{children}</Box>
    </Box>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.48 }}>{label}</Typography>
      <Typography sx={{ mt: 0.35, color: "#0f172a", fontWeight: 850, lineHeight: 1.35, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", overflowWrap: "anywhere" }}>{value ?? "-"}</Typography>
    </Box>
  );
}

export default function PhaseInspector({ phase, accent = "#ea580c" }) {
  if (!phase) {
    return <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.4, p: 3, textAlign: "center", bgcolor: "#f8fafc" }}><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Seleziona una fase per visualizzarne i dettagli.</Typography></Box>;
  }

  return (
    <Stack spacing={1.2}>
      <Section title="Inspector fase" icon={FactCheckOutlinedIcon} accent={accent}>
        <Stack spacing={1.3}>
          <PhaseHeader phase={phase} />
          <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6, fontWeight: 650 }}>{phase.description}</Typography>
          <Divider />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
            <Field label="Tipo" value={phase.type} />
            <Field label="Stato" value={phaseStatusLabel(phase.status)} />
            <Field label="Timeout" value={phase.timeout} />
            <Field label="Retry" value={phase.retry} />
            <Field label="Continua su errore" value={phase.continueOnError ? "Sì" : "No"} />
            <Field label="Ordine" value={phase.order} />
          </Box>
        </Stack>
      </Section>
      <Section title="Transizioni" icon={AccountTreeOutlinedIcon} accent={accent}>
        <PhaseTransitions successTransition={phase.successTransition} errorTransition={phase.errorTransition} />
      </Section>
      <Section title="Input e output" icon={DataObjectOutlinedIcon} accent={accent}>
        <PhaseIOTable input={phase.inputVariables} output={phase.outputVariables} />
      </Section>
    </Stack>
  );
}
