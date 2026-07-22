import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import VariableUsagePanel from "./VariableUsagePanel";
import { variableScopeLabel } from "./variableUtils";

function Section({ title, icon: Icon, children, accent = "#7c3aed" }) {
  return <Box sx={{ border: "1px solid #dbe5f0", borderRadius: 2.35, bgcolor: "#fff", overflow: "hidden" }}><Stack direction="row" spacing={0.8} alignItems="center" sx={{ px: 1.45, py: 1.1, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}><Icon sx={{ fontSize: 17, color: accent }} /><Typography sx={{ fontWeight: 950, color: "#0f172a", fontSize: 14 }}>{title}</Typography></Stack><Box sx={{ p: 1.45 }}>{children}</Box></Box>;
}
function Field({ label, value, mono = false }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.48 }}>{label}</Typography><Typography sx={{ mt: 0.35, color: "#0f172a", fontWeight: 850, lineHeight: 1.35, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", overflowWrap: "anywhere" }}>{value === "" || value === undefined || value === null ? "-" : String(value)}</Typography></Box>;
}

export default function VariableInspector({ variable, accent = "#7c3aed" }) {
  if (!variable) return <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.4, p: 3, textAlign: "center", bgcolor: "#f8fafc" }}><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Seleziona una variabile per visualizzarne i dettagli.</Typography></Box>;
  return (
    <Stack spacing={1.2}>
      <Section title="Inspector variabile" icon={DataObjectOutlinedIcon}>
        <Stack spacing={1.3}>
          <Box>
            <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography sx={{ color: "#0f172a", fontSize: 18, fontWeight: 950, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>{variable.name}</Typography>
              <Chip label={variableScopeLabel(variable.scope)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 900 }} />
              <Chip label={variable.type} size="small" variant="outlined" sx={{ fontWeight: 850 }} />
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.8, color: "#64748b", lineHeight: 1.6, fontWeight: 650 }}>{variable.description}</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
            <Field label="Scope" value={variableScopeLabel(variable.scope)} />
            <Field label="Tipo" value={variable.type} />
            <Field label="Origine" value={variable.source} />
            <Field label="Obbligatoria" value={variable.required ? "Sì" : "No"} />
            <Field label="Sensibile" value={variable.secret ? "Sì" : "No"} />
            <Field label="Valore default" value={variable.secret && variable.defaultValue ? "••••••••" : variable.defaultValue} mono />
          </Box>
        </Stack>
      </Section>
      <VariableUsagePanel variable={variable} accent={accent} />
      <Section title="Governance" icon={FactCheckOutlinedIcon}>
        <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6, fontWeight: 650 }}>La modifica strutturale delle variabili resta demandata al designer completo. Questo workspace espone il modello dati e il suo utilizzo senza alterare la definizione della procedura.</Typography>
      </Section>
    </Stack>
  );
}
