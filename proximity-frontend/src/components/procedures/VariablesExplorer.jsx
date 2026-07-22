import { Box, Chip, Stack, Typography } from "@mui/material";
import { variableScopeLabel } from "./variableUtils";

function VariableItem({ variable, selected, onSelect, accent }) {
  return (
    <Box
      role="button" tabIndex={0}
      onClick={() => onSelect(variable)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(variable); }}
      sx={{ p: 1.1, borderRadius: 2, border: selected ? `1px solid ${accent}` : "1px solid #dbe5f0", bgcolor: selected ? "#f5f3ff" : "#fff", cursor: "pointer", outline: "none", "&:hover": { borderColor: "#c4b5fd" }, "&:focus-visible": { boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.16)" } }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "#0f172a", fontWeight: 950, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>{variable.name}</Typography>
          <Typography variant="caption" sx={{ mt: 0.3, display: "block", color: "#64748b", fontWeight: 700 }}>{variable.description}</Typography>
        </Box>
        {variable.required && <Chip label="Obbligatoria" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: 10, fontWeight: 900 }} />}
      </Stack>
      <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
        <Chip label={variableScopeLabel(variable.scope)} size="small" variant="outlined" sx={{ height: 21, fontSize: 10.5, fontWeight: 850, bgcolor: "#fff" }} />
        <Chip label={variable.type} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: "#f8fafc" }} />
        {variable.secret && <Chip label="Sensibile" size="small" color="error" variant="outlined" sx={{ height: 21, fontSize: 10.5, fontWeight: 850 }} />}
      </Stack>
    </Box>
  );
}

export default function VariablesExplorer({ variables, selectedVariable, onSelect, accent = "#7c3aed" }) {
  if (variables.length === 0) {
    return <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.2, p: 3, textAlign: "center", bgcolor: "#f8fafc" }}><Typography sx={{ color: "#64748b", fontWeight: 800 }}>Nessuna variabile corrisponde ai filtri.</Typography></Box>;
  }
  return (
    <Stack spacing={0.8}>
      {variables.map((variable) => <VariableItem key={variable.id} variable={variable} selected={selectedVariable?.id === variable.id} onSelect={onSelect} accent={accent} />)}
    </Stack>
  );
}
