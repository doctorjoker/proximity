import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PhaseTimeline from "./PhaseTimeline";
import PhaseInspector from "./PhaseInspector";
import WorkspaceMetrics from "./WorkspaceMetrics";
import WorkspaceToolbar from "./WorkspaceToolbar";
import WorkspacePanel from "./WorkspacePanel";

const PHASE_ACCENT = "#ea580c";

export default function PhasesWorkspace({ procedure, version, phases, loading, error, onRetry, onOpenDetail }) {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => { setSelectedPhase(phases[0] || null); }, [phases]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return phases;
    return phases.filter((phase) => [phase.name, phase.action, phase.type, phase.description]
      .some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [phases, query]);

  useEffect(() => {
    if (selectedPhase && filtered.some((phase) => (phase.id || phase.order) === (selectedPhase.id || selectedPhase.order))) return;
    setSelectedPhase(filtered[0] || null);
  }, [filtered, selectedPhase]);

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      <WorkspaceMetrics
        accent={PHASE_ACCENT}
        items={[
          { label: "Versione", value: version || "-" },
          { label: "Fasi", value: phases.length },
          { label: "Visibili", value: filtered.length },
          { label: "Selezionata", value: selectedPhase?.order || "-", highlight: true },
        ]}
      />

      <WorkspaceToolbar title="Workspace fasi" subtitle="Naviga e ispeziona la sequenza operativa" accent={PHASE_ACCENT}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca per nome, azione o tipo..."
          size="small"
          fullWidth
          inputProps={{ "aria-label": "Cerca fasi" }}
        />
      </WorkspaceToolbar>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Riprova</Button>}>{error}</Alert>}

      {loading ? (
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress size={22} />
          <Typography sx={{ color: "#64748b", fontWeight: 800 }}>Caricamento fasi...</Typography>
        </Stack>
      ) : phases.length === 0 ? (
        <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.5, p: 4, textAlign: "center", bgcolor: "#f8fafc" }}>
          <AccountTreeOutlinedIcon sx={{ fontSize: 38, color: "#94a3b8" }} />
          <Typography sx={{ mt: 1, color: "#0f172a", fontWeight: 950 }}>Nessuna fase disponibile</Typography>
          <Typography variant="body2" sx={{ mt: 0.6, color: "#64748b" }}>La versione selezionata non espone ancora una sequenza di fasi.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 0.76fr) minmax(0, 1.24fr)" }, gap: 1.25, alignItems: "start", minWidth: 0 }}>
          <WorkspacePanel title="Sequenza" icon={AccountTreeOutlinedIcon} accent={PHASE_ACCENT} sx={{ maxHeight: { md: "calc(100vh - 455px)" }, overflowY: "auto" }}>
            <PhaseTimeline phases={filtered} selectedPhase={selectedPhase} onSelect={setSelectedPhase} accent={PHASE_ACCENT} />
          </WorkspacePanel>
          <Box sx={{ minWidth: 0 }}><PhaseInspector phase={selectedPhase} accent={PHASE_ACCENT} /></Box>
        </Box>
      )}

      <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => onOpenDetail?.(procedure, version)} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 900 }}>
        Apri designer completo
      </Button>
    </Stack>
  );
}
