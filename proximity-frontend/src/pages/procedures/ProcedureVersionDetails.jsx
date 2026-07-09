import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublishIcon from "@mui/icons-material/Publish";
import SchemaIcon from "@mui/icons-material/Schema";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";
import VariablesIcon from "@mui/icons-material/DataObject";
import PhaseToolbar from "./components/phases/PhaseToolbar";
import PhaseList from "./components/phases/PhaseList";
import PhaseDiagram from "./components/phases/PhaseDiagram";
import PhaseDrawer from "./components/phases/PhaseDrawer";
import LiveVariablesTab from "./components/variables/VariablesTab";
import LiveVariableDrawer from "./components/variables/VariableDrawer";
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

const runtimeConfig = [
  { label: "Timeout globale", value: "300s" },
  { label: "Retry default", value: "2 tentativi" },
  { label: "Rollback", value: "Manuale controllato" },
  { label: "Parallelismo", value: "Sequenziale" },
];

const auditEvents = [
  { date: "07/07/2026 19:50", title: "Test esecuzione completato", user: "Admin Proximity", detail: "Simulazione completata con esito positivo." },
  { date: "07/07/2026 19:42", title: "Aggiunta fase di verifica", user: "Admin Proximity", detail: "Inserita fase Verify runtime WAN dopo refresh ACS." },
  { date: "07/07/2026 18:10", title: "Creata bozza v1.3", user: "Admin Proximity", detail: "Bozza generata dalla versione attiva v1.2." },
  { date: "07/07/2026 16:18", title: "Pubblicata v1.2", user: "Admin Proximity", detail: "Versione resa attiva per nuove esecuzioni operative." },
];

function normalizeStatus(status) {
  if (status === "DRAFT") return "Bozza";
  if (status === "ACTIVE" || status === "PUBLISHED") return "Attiva";
  if (status === "READY") return "Pronta";
  if (status === "DEPRECATED" || status === "HISTORICAL" || status === "ARCHIVED") return "Storica";
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
    name: item.name || "Fase senza nome",
    action: item.action || "n/d",
    type: item.type || "Generic",
    timeout: item.timeout || "n/d",
    retry: item.retry ?? 0,
    status: item.status || "READY",
    description: item.description || "Fase operativa caricata dal backend Procedure Runtime.",
    continueOnError: Boolean(item.continue_on_error),
    successTransition: item.success_transition || "Fase successiva",
    errorTransition: item.error_transition || "Interrompi procedura",
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

  if (!payload.phase_order) {
    delete payload.phase_order;
  }

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
    description: item.description || "",
  };
}

function toVariablePayload(variable) {
  const valueOrEmpty = (value) => {
    if (value === undefined || value === null) return "";
    return String(value);
  };

  return {
    scope: variable.scope || "Input",
    name: valueOrEmpty(variable.name).trim().toUpperCase(),
    type: variable.type || "string",
    required: Boolean(variable.required),
    default_value: valueOrEmpty(variable.default_value ?? variable.defaultValue),
    description: valueOrEmpty(variable.description),
  };
}

function InfoCard({ title, icon, children }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
          {icon}
          <Typography variant="h6" fontWeight={850}>{title}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.7 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={750} textAlign="right">{value ?? "n/d"}</Typography>
    </Stack>
  );
}

function HeaderButton({ children, startIcon, variant = "outlined", onClick }) {
  return (
    <Button
      size="small"
      variant={variant}
      startIcon={startIcon}
      onClick={onClick}
      sx={{ height: 40, minWidth: 116, px: 1.6, borderRadius: 2, textTransform: "none", fontWeight: 800, whiteSpace: "nowrap" }}
    >
      {children}
    </Button>
  );
}

function SidebarSummary({ version, phasesCount, variableCount }) {
  const status = normalizeStatus(version?.status);
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={900}>Versione</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="h4" fontWeight={950}>{version?.version || "n/d"}</Typography>
              <Chip size="small" label={status} color={statusChipColor(version?.status)} />
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

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
        <Typography variant="h6" fontWeight={850} gutterBottom>Azioni rapide</Typography>
        <Stack spacing={1}>
          <Button fullWidth variant="contained" startIcon={<PublishIcon />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}>Pubblica bozza</Button>
          <Button fullWidth variant="outlined" startIcon={<PlayArrowIcon />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}>Esegui test</Button>
          <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}>Duplica versione</Button>
          <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}>Esporta JSON</Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

function PhaseEditorDrawer({ open, phase, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!phase) {
      setDraft(null);
      return;
    }
    setDraft({ ...phase });
  }, [phase]);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const handleSave = () => draft && onSave(draft);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, maxWidth: "100%" } }}>
      <Stack sx={{ height: "100%" }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={900}>Editor fase</Typography>
              <Typography variant="h5" fontWeight={950} sx={{ mt: 0.2 }}>{draft?.name || "Fase"}</Typography>
              {draft && <Typography variant="body2" color="text.secondary">#{draft.order} · {draft.action}</Typography>}
            </Box>
            <IconButton onClick={onClose} size="small"><MoreVertIcon fontSize="small" /></IconButton>
          </Stack>
        </Box>

        {draft && (
          <Box sx={{ p: 2.5, overflow: "auto", flex: 1 }}>
            <Stack spacing={2.2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Informazioni</Typography>
                <Stack spacing={2}>
                  <TextField label="Nome fase" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} fullWidth size="small" />
                  <TextField label="Descrizione" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} fullWidth multiline minRows={3} size="small" />
                  <TextField select label="Tipo" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)} fullWidth size="small">
                    {["Validation", "Inventory", "ACS", "Assurance", "OSS", "Event"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </TextField>
                  <TextField label="Azione / Handler" value={draft.action} onChange={(event) => updateDraft("action", event.target.value)} fullWidth size="small" />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Configurazione esecuzione</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField label="Timeout" value={draft.timeout} onChange={(event) => updateDraft("timeout", event.target.value)} fullWidth size="small" /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Retry" type="number" value={draft.retry} onChange={(event) => updateDraft("retry", Number(event.target.value))} fullWidth size="small" /></Grid>
                  <Grid item xs={12}><FormControlLabel control={<Switch checked={Boolean(draft.continueOnError)} onChange={(event) => updateDraft("continueOnError", event.target.checked)} />} label="Continua in caso di errore" /></Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Transizioni</Typography>
                <Stack spacing={2}>
                  <TextField label="Successo" value={draft.successTransition} onChange={(event) => updateDraft("successTransition", event.target.value)} fullWidth size="small" />
                  <TextField label="Errore" value={draft.errorTransition} onChange={(event) => updateDraft("errorTransition", event.target.value)} fullWidth size="small" />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Variabili</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField label="Input" value={draft.inputVariables} onChange={(event) => updateDraft("inputVariables", event.target.value)} fullWidth multiline minRows={4} size="small" /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Output" value={draft.outputVariables} onChange={(event) => updateDraft("outputVariables", event.target.value)} fullWidth multiline minRows={4} size="small" /></Grid>
                </Grid>
              </Paper>
            </Stack>
          </Box>
        )}

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>Annulla</Button>
            <Button variant="contained" onClick={handleSave} sx={{ textTransform: "none", fontWeight: 850 }}>Salva fase</Button>
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  );
}

function VariableEditorDrawer({ open, variable, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!variable) {
      setDraft(null);
      return;
    }
    setDraft({ ...variable });
  }, [variable]);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const handleSave = () => draft && onSave(draft);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 500 }, maxWidth: "100%" } }}>
      <Stack sx={{ height: "100%" }}>
        <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={900}>Editor variabile</Typography>
              <Typography variant="h5" fontWeight={950} sx={{ mt: 0.2 }}>{draft?.name || "Nuova variabile"}</Typography>
              {draft && <Typography variant="body2" color="text.secondary">{draft.scope} · {draft.type}</Typography>}
            </Box>
            <IconButton onClick={onClose} size="small"><MoreVertIcon fontSize="small" /></IconButton>
          </Stack>
        </Box>

        {draft && (
          <Box sx={{ p: 2.5, overflow: "auto", flex: 1 }}>
            <Stack spacing={2.2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Definizione</Typography>
                <Stack spacing={2}>
                  <TextField label="Nome variabile" value={draft.name} onChange={(event) => updateDraft("name", event.target.value.toUpperCase())} fullWidth size="small" />
                  <TextField select label="Scope" value={draft.scope} onChange={(event) => updateDraft("scope", event.target.value)} fullWidth size="small">
                    {["Input", "Output", "Secret", "Costante"].map((scope) => <MenuItem key={scope} value={scope}>{scope}</MenuItem>)}
                  </TextField>
                  <TextField select label="Tipo" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)} fullWidth size="small">
                    {["string", "number", "boolean", "object", "array", "secret"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </TextField>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Valori e validazione</Typography>
                <Stack spacing={2}>
                  <TextField label="Valore default" value={draft.defaultValue} onChange={(event) => updateDraft("defaultValue", event.target.value)} fullWidth size="small" />
                  <FormControlLabel control={<Switch checked={Boolean(draft.required)} onChange={(event) => updateDraft("required", event.target.checked)} />} label="Variabile obbligatoria" />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={900} gutterBottom>Descrizione</Typography>
                <TextField label="Descrizione operativa" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} fullWidth multiline minRows={4} size="small" />
              </Paper>
            </Stack>
          </Box>
        )}

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => draft && onDelete(draft)} sx={{ textTransform: "none", fontWeight: 800 }}>Elimina</Button>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>Annulla</Button>
              <Button variant="contained" onClick={handleSave} sx={{ textTransform: "none", fontWeight: 850 }}>Salva variabile</Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Drawer>
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
          {runtimeConfig.map((item) => <FieldRow key={item.label} label={item.label} value={item.value} />)}
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
      <PhaseToolbar
        view={view}
        onViewChange={setView}
        onCreatePhase={onCreatePhase}
      />

      {view === "diagram" ? (
        <PhaseDiagram phases={phases} onEditPhase={onEditPhase} />
      ) : (
        <PhaseList phases={phases} onEditPhase={onEditPhase} />
      )}
    </Stack>
  );
}

function VariablesTab({ items, onCreateVariable, onEditVariable, onDeleteVariable }) {
  const grouped = useMemo(() => items.reduce((acc, item) => {
    acc[item.scope] = acc[item.scope] || [];
    acc[item.scope].push(item);
    return acc;
  }, {}), [items]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={900}>Variabili procedura</Typography>
          <Typography variant="body2" color="text.secondary">Input, output, costanti e secret caricati dal backend.</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreateVariable} sx={{ textTransform: "none", fontWeight: 850, borderRadius: 2 }}>Nuova variabile</Button>
      </Stack>

      <Grid container spacing={2}>
        {Object.entries(grouped).map(([scope, scopeItems]) => (
          <Grid item xs={12} md={scope === "Secret" ? 12 : 6} key={scope}>
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
              <Box sx={{ p: 2.2 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <VariablesIcon color="primary" />
                  <Typography variant="h6" fontWeight={900}>{scope}</Typography>
                  <Chip size="small" label={scopeItems.length} variant="outlined" />
                </Stack>
              </Box>
              <Divider />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Obbl.</TableCell>
                    <TableCell>Descrizione</TableCell>
                    <TableCell align="right">Azioni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scopeItems.map((item) => (
                    <TableRow key={`${item.scope}-${item.name}`} hover>
                      <TableCell>
                        <Typography fontWeight={850}>{item.name}</Typography>
                        {item.defaultValue && <Typography variant="caption" color="text.secondary">Default: {item.defaultValue}</Typography>}
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.required ? "Sì" : "No"}</TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{item.description}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Modifica variabile"><IconButton size="small" onClick={() => onEditVariable(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Elimina variabile"><IconButton size="small" color="error" onClick={() => onDeleteVariable(item)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        ))}
        {items.length === 0 && (
          <Grid item xs={12}><Paper variant="outlined" sx={{ p: 3, borderRadius: 4, textAlign: "center" }}><Typography color="text.secondary">Nessuna variabile disponibile.</Typography></Paper></Grid>
        )}
      </Grid>
    </Stack>
  );
}

function TestTab({ procedure, version, phases }) {
  const defaultInputJson = `{
  "SERVICE_CODE": "INT-000001",
  "ACS_DEVICE_ID": "A842A1-XC220%2DG3v-223A3P3002697",
  "CUSTOMER_ID": "CLI-000001"
}`;
  const initialSteps = useMemo(() => [
    { step: "START", status: "PENDING", time: "-" },
    ...phases.map((phase) => ({ step: phase.name, status: "PENDING", time: "-" })),
    { step: "END", status: "PENDING", time: "-" },
  ], [phases]);

  const [inputJson, setInputJson] = useState(defaultInputJson);
  const [outputJson, setOutputJson] = useState("{}");
  const [timeline, setTimeline] = useState(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState("idle");
  const [durationMs, setDurationMs] = useState(null);
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    setTimeline(initialSteps);
  }, [initialSteps]);

  const colors = { PENDING: "default", RUNNING: "warning", OK: "success", FAILED: "error" };
  const resetSimulation = () => {
    setTimeline(initialSteps);
    setOutputJson("{}");
    setProgress(0);
    setResult("idle");
    setDurationMs(null);
    setInputError("");
  };

  const runSimulation = async () => {
    let parsedInput;
    try {
      parsedInput = JSON.parse(inputJson);
      setInputError("");
    } catch (_) {
      setInputError("JSON input non valido. Correggi la sintassi prima di eseguire il test.");
      setResult("failed");
      return;
    }

    setIsRunning(true);
    setResult("running");
    setDurationMs(null);
    setProgress(0);
    setOutputJson("{}");
    setTimeline(initialSteps);

    const startedAt = performance.now();
    const totalSteps = initialSteps.length;

    for (let index = 0; index < totalSteps; index += 1) {
      setTimeline((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: "RUNNING", time: "in corso" } : itemIndex > index ? { ...item, status: "PENDING", time: "-" } : item));
      await new Promise((resolve) => setTimeout(resolve, 360));
      const elapsed = Math.round(performance.now() - startedAt);
      setTimeline((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: "OK", time: `${elapsed}ms` } : item));
      setProgress(Math.round(((index + 1) / totalSteps) * 100));
    }

    const finalDuration = Math.round(performance.now() - startedAt);
    setOutputJson(JSON.stringify({
      success: true,
      result: "SUCCESS",
      mode: "SIMULATION",
      procedure_code: procedure.code,
      version: version.version,
      duration_ms: finalDuration,
      completed_phases: phases.length,
      input: parsedInput,
      output: { RESULT: "SUCCESS", ERROR_CODE: null, ERROR_MESSAGE: null },
    }, null, 2));
    setDurationMs(finalDuration);
    setResult("success");
    setIsRunning(false);
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
        <Box>
          <Typography variant="h6" fontWeight={900}>Test procedura</Typography>
          <Typography variant="body2" color="text.secondary">Simulatore locale predisposto per il collegamento al backend runtime.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={resetSimulation} disabled={isRunning} sx={{ textTransform: "none", fontWeight: 850, borderRadius: 2 }}>Reset</Button>
          <Button variant="contained" startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />} onClick={runSimulation} disabled={isRunning} sx={{ textTransform: "none", fontWeight: 850, borderRadius: 2 }}>{isRunning ? "Test in corso" : "Esegui test"}</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 4, height: "100%" }}>
            <Typography variant="overline" color="text.secondary" fontWeight={900}>Esito</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Chip label={result === "idle" ? "Non eseguito" : result === "running" ? "Running" : result === "success" ? "Success" : "Failed"} color={result === "success" ? "success" : result === "failed" ? "error" : result === "running" ? "warning" : "default"} sx={{ fontWeight: 900 }} />
              {durationMs !== null && <Typography variant="body2" color="text.secondary">{(durationMs / 1000).toFixed(2)}s</Typography>}
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 9, borderRadius: 99 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Avanzamento simulazione: {progress}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2.3, borderRadius: 4, height: "100%" }}>
            <Typography variant="overline" color="text.secondary" fontWeight={900}>Runtime mock</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>La simulazione valida l'input JSON, attraversa tutte le fasi della versione e produce un output compatibile con il futuro endpoint di test del Workflow Engine.</Typography>
            {inputError && <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 800 }}>{inputError}</Typography>}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={14} label="Input JSON" value={inputJson} onChange={(event) => setInputJson(event.target.value)} error={Boolean(inputError)} helperText={inputError || "Modifica il payload di test e avvia la simulazione."} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={14} label="Output JSON" value={outputJson} InputProps={{ readOnly: true }} /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={900}>Timeline test</Typography>
            <Typography variant="body2" color="text.secondary">Stato live delle fasi durante la simulazione.</Typography>
          </Box>
          <Chip size="small" label={`${timeline.filter((item) => item.status === "OK").length}/${timeline.length}`} variant="outlined" />
        </Stack>
        <Stack spacing={1}>{timeline.map((item) => <Stack key={item.step} direction="row" spacing={1.5} alignItems="center"><Chip size="small" label={item.status} color={colors[item.status]} sx={{ minWidth: 92, fontWeight: 850 }} /><Typography fontWeight={800} sx={{ flex: 1 }}>{item.step}</Typography><Typography variant="body2" color="text.secondary">{item.time}</Typography></Stack>)}</Stack>
      </Paper>
    </Stack>
  );
}

function AuditTab() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
      <Typography variant="h6" fontWeight={900} gutterBottom>Audit versione</Typography>
      <Stack spacing={0}>
        {auditEvents.map((item, index) => (
          <Stack key={`${item.date}-${item.title}`} direction="row" spacing={2}>
            <Stack alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: index === 0 ? "primary.main" : "divider", mt: 0.8 }} />
              {index < auditEvents.length - 1 && <Box sx={{ width: 2, flex: 1, minHeight: 58, bgcolor: "divider" }} />}
            </Stack>
            <Box sx={{ pb: 2.5 }}>
              <Typography fontWeight={900}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">{item.date} · {item.user}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{item.detail}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export default function ProcedureVersionDetails() {
  const params = useParams();
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

  useEffect(() => {
    let active = true;

    async function loadVersionDetail() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/procedures/${procedureCode}/versions/${versionParam}`);
        if (!response.ok) {
          throw new Error(`Errore caricamento dettaglio versione (${response.status})`);
        }

        const payload = await response.json();
        if (!active) return;

        setVersionData(payload.version || null);
        setPhasesData(Array.isArray(payload.phases) ? payload.phases.map(mapPhase) : []);
        setVariablesData(Array.isArray(payload.variables) ? payload.variables.map(mapVariable) : []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Errore imprevisto durante il caricamento del dettaglio versione.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVersionDetail();

    return () => {
      active = false;
    };
  }, [procedureCode, versionParam]);

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
      name: "",
      action: "",
      type: "Validation",
      timeout: "30s",
      retry: 0,
      status: "READY",
      description: "",
      continue_on_error: false,
      success_transition: "",
      error_transition: "",
      input_variables: "",
      output_variables: "",
    });
    setPhaseDrawerOpen(true);
  };

  const handleEditPhase = (phase) => {
    setSelectedPhase(phase);
    setPhaseDrawerOpen(true);
  };

  const handleClosePhaseDrawer = () => {
    if (!phaseSaving) {
      setPhaseDrawerOpen(false);
    }
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

  const handleCloseVariableDrawer = () => {
    if (!variableSaving) {
      setVariableDrawerOpen(false);
    }
  };

  const handleSaveVariable = async (updatedVariable) => {
    setVariableSaving(true);
    try {
      const payload = toVariablePayload(updatedVariable);

      if (!payload.name) {
        throw new Error("Nome variabile obbligatorio.");
      }

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

  const tabContent = [
    <OverviewTab key="overview" procedure={procedure} version={version} phases={phasesData} variables={variablesData} />,
    <PhasesTab key="phases" phases={phasesData} onEditPhase={handleEditPhase} onCreatePhase={handleCreatePhase} />,
    <LiveVariablesTab key="variables" items={variablesData} onCreateVariable={handleCreateVariable} onEditVariable={handleEditVariable} onDeleteVariable={handleDeleteVariable} />,
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
                  <Button size="small" startIcon={<ArrowBackIcon />} variant="text" component={RouterLink} to={`/procedures/${procedure.code}/versions`} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 800 }}>Versioni procedura</Button>
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
                <HeaderButton startIcon={<PlayArrowIcon />}>Test</HeaderButton>
                <HeaderButton startIcon={<ContentCopyIcon />}>Duplica</HeaderButton>
                <HeaderButton startIcon={<DownloadIcon />}>Esporta</HeaderButton>
                <HeaderButton startIcon={<PublishIcon />} variant="contained">Pubblica</HeaderButton>
              </Stack>
            </Stack>
          </Paper>

          {error && <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "error.main" }}><Typography color="error" fontWeight={900}>Errore caricamento dettaglio versione</Typography><Typography variant="body2" color="text.secondary">{error}</Typography></Paper>}

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
                    <Stack alignItems="center" spacing={2} sx={{ py: 6 }}><CircularProgress /><Typography color="text.secondary" fontWeight={800}>Caricamento dettaglio versione...</Typography></Stack>
                  ) : tabContent[tab]}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={3.3}>
              <SidebarSummary version={version} phasesCount={phasesData.length} variableCount={variablesData.length} />
            </Grid>
          </Grid>
        </Stack>
        <PhaseDrawer open={phaseDrawerOpen} phase={selectedPhase} onClose={handleClosePhaseDrawer} onSave={handleSavePhase} onDelete={handleDeletePhase} saving={phaseSaving} />
        <LiveVariableDrawer open={variableDrawerOpen} variable={selectedVariable} onClose={handleCloseVariableDrawer} onSave={handleSaveVariable} onDelete={handleDeleteVariable} saving={variableSaving} />
      </Box>
    </AppLayout>
  );
}
