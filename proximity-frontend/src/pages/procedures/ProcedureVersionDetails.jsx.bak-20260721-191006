import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublishIcon from "@mui/icons-material/Publish";
import RuleIcon from "@mui/icons-material/Rule";
import SchemaIcon from "@mui/icons-material/Schema";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";

import PhaseToolbar from "./components/phases/PhaseToolbar";
import PhaseList from "./components/phases/PhaseList";
import PhaseDiagram from "./components/phases/PhaseDiagram";
import PhaseDrawer from "./components/phases/PhaseDrawer";
import VariablesTab from "./components/variables/VariablesTab";
import VariableDrawer from "./components/variables/VariableDrawer";

import {
  listPhases,
  createPhase,
  updatePhase,
  deletePhase,
} from "../../services/phaseService";
import {
  listVariables,
  createVariable,
  updateVariable,
  deleteVariable,
} from "../../services/variableService";
import {
  validateProcedureVersion,
  publishProcedureVersion,
  cloneProcedureVersion,
} from "../../services/publishService";

const runtimeConfig = [
  { label: "Timeout globale", value: "300s" },
  { label: "Retry default", value: "2 tentativi" },
  { label: "Rollback", value: "Manuale controllato" },
  { label: "Parallelismo", value: "Sequenziale" },
];

const auditEvents = [
  {
    date: "Runtime",
    title: "Audit operativo",
    user: "Procedure Runtime",
    detail: "Timeline predisposta per collegamento allo storico esecuzioni.",
  },
];

function normalizeStatus(status) {
  if (status === "DRAFT") return "Bozza";
  if (status === "ACTIVE" || status === "PUBLISHED") return "Attiva";
  if (status === "READY") return "Pronta";
  if (["DEPRECATED", "HISTORICAL", "ARCHIVED"].includes(status)) return "Storica";
  return status || "n/d";
}

function statusChipColor(status) {
  const label = normalizeStatus(status);
  if (label === "Bozza") return "warning";
  if (label === "Attiva" || label === "Pronta") return "success";
  if (label === "Storica") return "default";
  return "default";
}

function formatDate(value) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapPhase(item) {
  return {
    ...item,
    order: item.phase_order ?? item.order,
    phase_order: item.phase_order ?? item.order,
    name: item.name || "Fase senza nome",
    action: item.action || "n/d",
    type: item.type || "Generic",
    timeout: item.timeout || "30s",
    retry: item.retry ?? 0,
    status: item.status || "READY",
    description: item.description || "",
    continueOnError: Boolean(item.continue_on_error),
    successTransition: item.success_transition || "",
    errorTransition: item.error_transition || "",
    inputVariables: (item.input_variables || "").replaceAll("\\n", "\n"),
    outputVariables: (item.output_variables || "").replaceAll("\\n", "\n"),
  };
}

function toPhasePayload(phase) {
  const valueOrNull = (value) => {
    if (value === undefined || value === null) return null;
    const stringValue = String(value);
    return stringValue.trim() === "" ? null : stringValue;
  };

  const payload = {
    phase_order: phase.phase_order || phase.order || undefined,
    name: phase.name,
    action: phase.action,
    type: phase.type || "Validation",
    timeout: phase.timeout || "30s",
    retry: Number(phase.retry ?? 0),
    status: phase.status || "READY",
    description: valueOrNull(phase.description),
    continue_on_error: Boolean(phase.continue_on_error ?? phase.continueOnError),
    success_transition: valueOrNull(phase.success_transition ?? phase.successTransition),
    error_transition: valueOrNull(phase.error_transition ?? phase.errorTransition),
    input_variables: valueOrNull(phase.input_variables ?? phase.inputVariables),
    output_variables: valueOrNull(phase.output_variables ?? phase.outputVariables),
  };

  if (!payload.phase_order) delete payload.phase_order;
  return payload;
}

function mapVariable(item) {
  return {
    ...item,
    scope: item.scope || "Input",
    name: item.name || "VARIABLE",
    type: item.type || "string",
    required: Boolean(item.required),
    defaultValue: item.default_value ?? item.defaultValue ?? "",
    default_value: item.default_value ?? item.defaultValue ?? "",
    description: item.description || "",
  };
}

function toVariablePayload(variable) {
  return {
    scope: variable.scope || "Input",
    name: variable.name || "VARIABLE",
    type: variable.type || "string",
    required: Boolean(variable.required),
    default_value: variable.default_value ?? variable.defaultValue ?? "",
    description: variable.description || "",
  };
}

function InfoCard({ title, icon, children }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
          {icon}
          <Typography variant="h6" fontWeight={850}>
            {title}
          </Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.7 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={750} textAlign="right">
        {value ?? "n/d"}
      </Typography>
    </Stack>
  );
}

function HeaderButton({ children, startIcon, variant = "outlined", onClick, disabled }) {
  return (
    <Button
      size="small"
      variant={variant}
      startIcon={startIcon}
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 40,
        minWidth: 116,
        px: 1.6,
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Button>
  );
}

function SidebarSummary({ version, phasesCount, variableCount }) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={900}>
              Versione
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="h4" fontWeight={950}>
                {version?.version || "n/d"}
              </Typography>
              <Chip size="small" label={normalizeStatus(version?.status)} color={statusChipColor(version?.status)} />
            </Stack>
          </Box>
          <Divider />
          <FieldRow label="Fasi" value={phasesCount} />
          <FieldRow label="Variabili" value={variableCount} />
          <FieldRow label="Base" value={version?.base_version || "-"} />
          <FieldRow label="Creato da" value={version?.created_by || "n/d"} />
          <Divider />
          <FieldRow label="Ultima modifica" value={formatDate(version?.updated_at)} />
          <FieldRow label="Pubblicata" value={formatDate(version?.published_at)} />
        </Stack>
      </Paper>
    </Stack>
  );
}

function OverviewTab({ procedure, version, phases, variables }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <InfoCard title="Informazioni" icon={<SchemaIcon color="primary" />}>
          <FieldRow label="Nome" value={procedure.name} />
          <FieldRow label="Codice" value={procedure.code} />
          <FieldRow label="Categoria" value={procedure.category} />
          <FieldRow label="Trigger" value={procedure.trigger_type} />
          <FieldRow label="Owner" value={procedure.owner} />
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <InfoCard title="Configurazione runtime" icon={<TuneIcon color="primary" />}>
          {runtimeConfig.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <InfoCard title="Statistiche" icon={<TimelineIcon color="primary" />}>
          <FieldRow label="Fasi" value={phases.length} />
          <FieldRow label="Variabili" value={variables.length} />
          <FieldRow label="Stato" value={normalizeStatus(version.status)} />
          <FieldRow label="Versione base" value={version.base_version || "-"} />
          <LinearProgress variant="determinate" value={phases.length ? 100 : 0} sx={{ mt: 1, height: 8, borderRadius: 99 }} />
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <InfoCard title="Cronologia" icon={<HistoryIcon color="primary" />}>
          <FieldRow label="Creazione" value={formatDate(version.created_at)} />
          <FieldRow label="Ultima modifica" value={formatDate(version.updated_at)} />
          <FieldRow label="Pubblicazione" value={formatDate(version.published_at)} />
          <FieldRow label="Creato da" value={version.created_by} />
        </InfoCard>
      </Grid>
    </Grid>
  );
}

function PhasesTab({ phases, onEditPhase, onCreatePhase }) {
  const [view, setView] = useState("list");
  return (
    <Stack spacing={2}>
      <PhaseToolbar view={view} onViewChange={setView} onCreatePhase={onCreatePhase} />
      {view === "diagram" ? (
        <PhaseDiagram phases={phases} onEditPhase={onEditPhase} />
      ) : (
        <PhaseList phases={phases} onEditPhase={onEditPhase} />
      )}
    </Stack>
  );
}

function TestTab({ procedure, version, phases }) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
        <Typography variant="h6" fontWeight={900} gutterBottom>
          Test procedura
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Runtime test backend già predisposto. La simulazione completa verrà collegata nella milestone Execution Runtime.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label={procedure.code} variant="outlined" />
          <Chip label={version.version} color="primary" variant="outlined" />
          <Chip label={`${phases.length} fasi`} variant="outlined" />
        </Stack>
      </Paper>
    </Stack>
  );
}

function AuditTab() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
      <Typography variant="h6" fontWeight={900} gutterBottom>
        Audit versione
      </Typography>
      <Stack spacing={0}>
        {auditEvents.map((item, index) => (
          <Stack key={`${item.date}-${item.title}`} direction="row" spacing={2}>
            <Stack alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: index === 0 ? "primary.main" : "divider", mt: 0.8 }} />
            </Stack>
            <Box sx={{ pb: 2.5 }}>
              <Typography fontWeight={900}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.date} · {item.user}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {item.detail}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function ActionResultDialog({ open, title, result, onClose }) {
  const issues = result?.issues || result?.validation?.issues || [];
  const warnings = result?.warnings || result?.validation?.warnings || [];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {result ? (
          <Stack spacing={2}>
            <Alert severity={result.valid === false ? "error" : "success"}>
              {result.valid === false ? "Validazione fallita" : "Operazione completata correttamente"}
            </Alert>
            <TextField fullWidth multiline minRows={8} value={JSON.stringify(result, null, 2)} InputProps={{ readOnly: true }} />
            {issues.length > 0 && <Alert severity="error">Issue: {issues.length}</Alert>}
            {warnings.length > 0 && <Alert severity="warning">Warning: {warnings.length}</Alert>}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PublishConfirmDialog({ open, onClose, onConfirm, saving, version }) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pubblica versione</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning">
            Pubblicando la versione {version}, questa diventerà la versione attiva della procedura. L'eventuale versione attiva precedente diventerà storica.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Annulla
        </Button>
        <Button disabled={saving} variant="contained" onClick={onConfirm} sx={{ textTransform: "none", fontWeight: 850 }}>
          {saving ? "Pubblicazione..." : "Pubblica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CloneDialog({ open, onClose, onConfirm, saving, sourceVersion }) {
  const [targetVersion, setTargetVersion] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTargetVersion("");
      setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Duplica versione</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">Clona {sourceVersion} come nuova bozza.</Alert>
          <TextField label="Nuova versione" value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)} placeholder="v1.4" fullWidth size="small" />
          <TextField label="Note" value={notes} onChange={(event) => setNotes(event.target.value)} fullWidth multiline minRows={3} size="small" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Annulla
        </Button>
        <Button
          disabled={saving || !targetVersion.trim()}
          variant="contained"
          onClick={() => onConfirm({ target_version: targetVersion.trim(), notes })}
          sx={{ textTransform: "none", fontWeight: 850 }}
        >
          {saving ? "Clonazione..." : "Clona"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProcedureVersionDetails() {
  const params = useParams();
  const navigate = useNavigate();
  const procedureCode = params.definitionCode || params.procedureCode || "PROC-ROUTER-REPLACEMENT";
  const versionParam = params.version || "v1.3";

  const [tab, setTab] = useState(0);
  const [versionData, setVersionData] = useState(null);
  const [phasesData, setPhasesData] = useState([]);
  const [variablesData, setVariablesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseDrawerOpen, setPhaseDrawerOpen] = useState(false);
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [variableDrawerOpen, setVariableDrawerOpen] = useState(false);
  const [variableSaving, setVariableSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionTitle, setActionTitle] = useState("Risultato");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

  const procedure = useMemo(() => ({
    code: versionData?.procedure_code || procedureCode,
    name: versionData?.procedure_name || "Procedura",
    category: versionData?.category || "n/d",
    trigger_type: versionData?.trigger_type || "n/d",
    owner: versionData?.owner || "n/d",
  }), [versionData, procedureCode]);

  const version = useMemo(() => ({
    version: versionData?.version || versionParam,
    status: versionData?.status || "DRAFT",
    base_version: versionData?.base_version,
    notes: versionData?.notes,
    created_by: versionData?.created_by,
    created_at: versionData?.created_at,
    updated_at: versionData?.updated_at,
    published_at: versionData?.published_at,
  }), [versionData, versionParam]);

  const loadVersionDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/procedures/${procedureCode}/versions/${versionParam}`);
      if (!response.ok) throw new Error(`Errore caricamento dettaglio versione (${response.status})`);
      const payload = await response.json();
      setVersionData(payload.version || null);
      setPhasesData(Array.isArray(payload.phases) ? payload.phases.map(mapPhase) : []);
      setVariablesData(Array.isArray(payload.variables) ? payload.variables.map(mapVariable) : []);
    } catch (err) {
      setError(err.message || "Errore imprevisto durante il caricamento del dettaglio versione.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersionDetail();
  }, [procedureCode, versionParam]);

  const refreshPhases = async () => {
    const response = await listPhases(procedure.code, version.version);
    const items = Array.isArray(response.items) ? response.items : [];
    setPhasesData(items.map(mapPhase));
  };

  const refreshVariables = async () => {
    const response = await listVariables(procedure.code, version.version);
    const items = Array.isArray(response.items) ? response.items : [];
    setVariablesData(items.map(mapVariable));
  };

  const handleCreatePhase = () => {
    setSelectedPhase({
      isNew: true,
      phase_order: phasesData.length + 1,
      order: phasesData.length + 1,
      name: "",
      action: "",
      type: "Validation",
      timeout: "30s",
      retry: 0,
      status: "READY",
      description: "",
      continueOnError: false,
      successTransition: "",
      errorTransition: "",
      inputVariables: "",
      outputVariables: "",
    });
    setPhaseDrawerOpen(true);
  };

  const handleEditPhase = (phase) => {
    setSelectedPhase(phase);
    setPhaseDrawerOpen(true);
  };

  const handleSavePhase = async (updatedPhase) => {
    setPhaseSaving(true);
    try {
      const payload = toPhasePayload(updatedPhase);
      if (updatedPhase.isNew || !updatedPhase.id) {
        await createPhase(procedure.code, version.version, payload);
      } else {
        await updatePhase(procedure.code, version.version, updatedPhase.id, payload);
      }
      await refreshPhases();
      setSelectedPhase(null);
      setPhaseDrawerOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore salvataggio fase.");
    } finally {
      setPhaseSaving(false);
    }
  };

  const handleDeletePhase = async (phase) => {
    if (!phase?.id || phase.isNew) {
      setPhaseDrawerOpen(false);
      return;
    }
    setPhaseSaving(true);
    try {
      await deletePhase(procedure.code, version.version, phase.id);
      await refreshPhases();
      setSelectedPhase(null);
      setPhaseDrawerOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore eliminazione fase.");
    } finally {
      setPhaseSaving(false);
    }
  };

  const handleCreateVariable = () => {
    setSelectedVariable({
      isNew: true,
      scope: "Input",
      name: "",
      type: "string",
      required: false,
      defaultValue: "",
      description: "",
    });
    setVariableDrawerOpen(true);
  };

  const handleEditVariable = (variable) => {
    setSelectedVariable(variable);
    setVariableDrawerOpen(true);
  };

  const handleSaveVariable = async (updatedVariable) => {
    setVariableSaving(true);
    try {
      const payload = toVariablePayload(updatedVariable);
      if (updatedVariable.isNew || !updatedVariable.id) {
        await createVariable(procedure.code, version.version, payload);
      } else {
        await updateVariable(procedure.code, version.version, updatedVariable.id, payload);
      }
      await refreshVariables();
      setSelectedVariable(null);
      setVariableDrawerOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore salvataggio variabile.");
    } finally {
      setVariableSaving(false);
    }
  };

  const handleDeleteVariable = async (variable) => {
    if (!variable?.id || variable.isNew) {
      setVariableDrawerOpen(false);
      return;
    }
    setVariableSaving(true);
    try {
      await deleteVariable(procedure.code, version.version, variable.id);
      await refreshVariables();
      setSelectedVariable(null);
      setVariableDrawerOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore eliminazione variabile.");
    } finally {
      setVariableSaving(false);
    }
  };

  const handleValidate = async () => {
    setActionSaving(true);
    try {
      const result = await validateProcedureVersion(procedure.code, version.version, { requested_by: "Admin Proximity" });
      setActionTitle("Validazione versione");
      setActionResult(result);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore validazione versione.");
    } finally {
      setActionSaving(false);
    }
  };

  const handlePublish = async () => {
    setActionSaving(true);
    try {
      const result = await publishProcedureVersion(procedure.code, version.version, { requested_by: "Admin Proximity", force: false });
      setPublishDialogOpen(false);
      setActionTitle("Pubblicazione versione");
      setActionResult(result);
      await loadVersionDetail();
      setError(null);
    } catch (err) {
      setError(err.message || "Errore pubblicazione versione.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleClone = async ({ target_version, notes }) => {
    setActionSaving(true);
    try {
      const result = await cloneProcedureVersion(procedure.code, version.version, {
        requested_by: "Admin Proximity",
        target_version,
        notes,
      });
      setCloneDialogOpen(false);
      setActionTitle("Clonazione versione");
      setActionResult(result);
      const clonedVersion = result?.version?.version || target_version;
      navigate(`/procedures/${procedure.code}/versions/${clonedVersion}`);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore clonazione versione.");
    } finally {
      setActionSaving(false);
    }
  };

  const tabContent = [
    <OverviewTab key="overview" procedure={procedure} version={version} phases={phasesData} variables={variablesData} />,
    <PhasesTab key="phases" phases={phasesData} onEditPhase={handleEditPhase} onCreatePhase={handleCreatePhase} />,
    <VariablesTab key="variables" items={variablesData} onCreateVariable={handleCreateVariable} onEditVariable={handleEditVariable} onDeleteVariable={handleDeleteVariable} />,
    <TestTab key="test" procedure={procedure} version={version} phases={phasesData} />,
    <AuditTab key="audit" />,
  ];

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1540, mx: "auto" }}>
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid", borderColor: "divider", background: "linear-gradient(135deg, rgba(30,90,168,0.10), rgba(255,122,0,0.08))" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
              <Stack spacing={1.1} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button size="small" startIcon={<ArrowBackIcon />} variant="text" component={RouterLink} to={`/procedures/${procedure.code}/versions`} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 800 }}>
                    Versioni procedura
                  </Button>
                  <Typography variant="body2" color="text.secondary">/ {procedure.name} / {version.version}</Typography>
                  {loading && <Chip size="small" label="Caricamento dati live" variant="outlined" />}
                </Stack>
                <Box>
                  <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: -0.5 }}>Dettaglio versione procedura</Typography>
                  <Typography variant="body1" color="text.secondary">{procedure.name} · {procedure.code}</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={normalizeStatus(version.status)} color={statusChipColor(version.status)} />
                  <Chip label={version.version} color="primary" variant="outlined" />
                  <Chip label={procedure.category} variant="outlined" />
                  <Chip label={`Trigger: ${procedure.trigger_type}`} variant="outlined" />
                  <Chip label={`Owner: ${procedure.owner}`} variant="outlined" />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                <HeaderButton startIcon={<RuleIcon />} onClick={handleValidate} disabled={actionSaving}>Valida</HeaderButton>
                <HeaderButton startIcon={<PlayArrowIcon />} disabled={actionSaving}>Test</HeaderButton>
                <HeaderButton startIcon={<ContentCopyIcon />} onClick={() => setCloneDialogOpen(true)} disabled={actionSaving}>Duplica</HeaderButton>
                <HeaderButton startIcon={<DownloadIcon />} disabled={actionSaving}>Esporta</HeaderButton>
                <HeaderButton startIcon={<PublishIcon />} variant="contained" onClick={() => setPublishDialogOpen(true)} disabled={actionSaving || version.status === "ACTIVE"}>Pubblica</HeaderButton>
              </Stack>
            </Stack>
          </Paper>

          {error && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "error.main" }}>
              <Typography color="error" fontWeight={900}>Errore</Typography>
              <Typography variant="body2" color="text.secondary">{error}</Typography>
            </Paper>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8.7}>
              <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ px: 2 }}>
                  <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                    <Tab label="Overview" />
                    <Tab label="Fasi" />
                    <Tab label="Variabili" />
                    <Tab label="Test" />
                    <Tab label="Audit" />
                  </Tabs>
                </Box>
                <Divider />
                <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                  {loading ? (
                    <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                      <CircularProgress />
                      <Typography color="text.secondary" fontWeight={800}>Caricamento dettaglio versione...</Typography>
                    </Stack>
                  ) : tabContent[tab]}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={3.3}>
              <SidebarSummary version={version} phasesCount={phasesData.length} variableCount={variablesData.length} />
            </Grid>
          </Grid>
        </Stack>

        <PhaseDrawer open={phaseDrawerOpen} phase={selectedPhase} onClose={() => !phaseSaving && setPhaseDrawerOpen(false)} onSave={handleSavePhase} onDelete={handleDeletePhase} saving={phaseSaving} />
        <VariableDrawer open={variableDrawerOpen} variable={selectedVariable} onClose={() => !variableSaving && setVariableDrawerOpen(false)} onSave={handleSaveVariable} onDelete={handleDeleteVariable} saving={variableSaving} />

        <ActionResultDialog open={Boolean(actionResult)} title={actionTitle} result={actionResult} onClose={() => setActionResult(null)} />
        <PublishConfirmDialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} onConfirm={handlePublish} saving={actionSaving} version={version.version} />
        <CloneDialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)} onConfirm={handleClone} saving={actionSaving} sourceVersion={version.version} />
      </Box>
    </AppLayout>
  );
}
