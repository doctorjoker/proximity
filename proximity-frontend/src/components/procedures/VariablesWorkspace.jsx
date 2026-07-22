import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VariableSearchBar from "./VariableSearchBar";
import VariableScopeTree from "./VariableScopeTree";
import VariablesExplorer from "./VariablesExplorer";
import VariableInspector from "./VariableInspector";
import WorkspaceMetrics from "./WorkspaceMetrics";
import WorkspaceToolbar from "./WorkspaceToolbar";
import WorkspacePanel from "./WorkspacePanel";

const VARIABLE_ACCENT = "#7c3aed";

export default function VariablesWorkspace({ procedure, version, variables, loading, error, onRetry, onOpenDetail }) {
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [scope, setScope] = useState("ALL");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");

  useEffect(() => { setSelectedVariable(variables[0] || null); }, [variables]);

  const counts = useMemo(() => ({
    ALL: variables.length,
    INPUT: variables.filter((item) => item.scope === "INPUT").length,
    RUNTIME: variables.filter((item) => item.scope === "RUNTIME").length,
    OUTPUT: variables.filter((item) => item.scope === "OUTPUT").length,
    SYSTEM: variables.filter((item) => item.scope === "SYSTEM").length,
  }), [variables]);

  const types = useMemo(() => [...new Set(variables.map((item) => item.type).filter(Boolean))].sort(), [variables]);

  const filtered = useMemo(() => variables.filter((item) => {
    if (scope !== "ALL" && item.scope !== scope) return false;
    if (type !== "ALL" && item.type !== type) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [item.name, item.label, item.description, item.source, item.type]
      .some((value) => String(value || "").toLowerCase().includes(needle));
  }), [variables, scope, type, query]);

  useEffect(() => {
    if (selectedVariable && filtered.some((item) => item.id === selectedVariable.id)) return;
    setSelectedVariable(filtered[0] || null);
  }, [filtered, selectedVariable]);

  return (
    <Stack spacing={1.25} sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
      <WorkspaceMetrics
        accent={VARIABLE_ACCENT}
        items={[
          { label: "Versione", value: version || "-" },
          { label: "Variabili", value: variables.length },
          { label: "Visibili", value: filtered.length },
          { label: "Scope", value: scope === "ALL" ? "Tutti" : scope, highlight: true },
        ]}
      />

      <WorkspaceToolbar title="Workspace variabili" subtitle="Esplora modello dati, origine e utilizzo" accent={VARIABLE_ACCENT}>
        <VariableSearchBar query={query} onQueryChange={setQuery} type={type} types={types} onTypeChange={setType} />
      </WorkspaceToolbar>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Riprova</Button>}>{error}</Alert>}

      {loading ? (
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress size={22} />
          <Typography sx={{ color: "#64748b", fontWeight: 800 }}>Caricamento variabili...</Typography>
        </Stack>
      ) : variables.length === 0 ? (
        <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.5, p: 4, textAlign: "center", bgcolor: "#f8fafc" }}>
          <DataObjectOutlinedIcon sx={{ fontSize: 38, color: "#94a3b8" }} />
          <Typography sx={{ mt: 1, color: "#0f172a", fontWeight: 950 }}>Nessuna variabile disponibile</Typography>
          <Typography variant="body2" sx={{ mt: 0.6, color: "#64748b" }}>La versione selezionata non espone ancora un modello dati.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(210px, 0.78fr) minmax(0, 1.22fr)" }, gap: 1.25, alignItems: "start", width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Stack spacing={1.05} sx={{ minWidth: 0 }}>
            <WorkspacePanel title="Scope" icon={DataObjectOutlinedIcon} accent={VARIABLE_ACCENT}>
              <VariableScopeTree selectedScope={scope} counts={counts} onSelect={setScope} accent={VARIABLE_ACCENT} />
            </WorkspacePanel>
            <Box sx={{ minWidth: 0, maxHeight: { sm: "calc(100vh - 525px)" }, overflowY: "auto", overflowX: "hidden", pr: { sm: 0.25 } }}>
              <VariablesExplorer variables={filtered} selectedVariable={selectedVariable} onSelect={setSelectedVariable} accent={VARIABLE_ACCENT} />
            </Box>
          </Stack>

          <Box sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
            <VariableInspector variable={selectedVariable} accent={VARIABLE_ACCENT} />
          </Box>
        </Box>
      )}

      <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => onOpenDetail?.(procedure, version)} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 900 }}>
        Apri designer completo
      </Button>
    </Stack>
  );
}
