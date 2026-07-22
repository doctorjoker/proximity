import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PublishIcon from "@mui/icons-material/Publish";
import VisibilityIcon from "@mui/icons-material/Visibility";

import {
  formatDate,
  getActiveVersion,
  getDeprecatedVersions,
  getDraftVersion,
  getVersions,
  operatorDescription,
  operatorName,
  procedureCode,
} from "./catalogUtils";

import PhasesWorkspace from "./PhasesWorkspace";
import VariablesWorkspace from "./VariablesWorkspace";
import ExecutionsWorkspace from "./ExecutionsWorkspace";
import { extractVariables } from "./variableUtils";

import { cloneProcedureVersion, publishProcedureVersion } from "../../services/publishService";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getPhaseCount(version) {
  return Number(
    firstDefined(
      version?.phase_count,
      version?.steps_count,
      toArray(version?.phases).length,
      toArray(version?.steps).length,
      0,
    ),
  );
}

function getVariableCount(version) {
  const explicit = firstDefined(version?.variable_count, version?.variables_count);
  if (explicit !== undefined) return Number(explicit);

  const variables = toArray(version?.variables);
  const inputs = toArray(version?.input_variables);
  const outputs = toArray(version?.output_variables);
  return variables.length + inputs.length + outputs.length;
}

function getExecutionCount(procedure, version) {
  return Number(
    firstDefined(
      procedure?.execution_count,
      procedure?.executions_count,
      version?.execution_count,
      version?.executions_count,
      0,
    ),
  );
}

function normalizePhase(item, index) {
  return {
    ...item,
    order: Number(firstDefined(item?.phase_order, item?.order, index + 1)),
    name: firstDefined(item?.name, item?.label, `Fase ${index + 1}`),
    action: firstDefined(item?.action, item?.handler, item?.handler_name, "n/d"),
    type: firstDefined(item?.type, item?.phase_type, "Generic"),
    timeout: firstDefined(item?.timeout, item?.timeout_seconds, "n/d"),
    retry: Number(firstDefined(item?.retry, item?.retry_count, item?.max_retries, 0)),
    status: firstDefined(item?.status, "READY"),
    description: firstDefined(item?.description, "Nessuna descrizione disponibile per questa fase."),
    continueOnError: Boolean(firstDefined(item?.continue_on_error, item?.continueOnError, false)),
    successTransition: firstDefined(item?.success_transition, item?.on_success, "Fase successiva"),
    errorTransition: firstDefined(item?.error_transition, item?.on_error, "Interrompi procedura"),
    inputVariables: firstDefined(item?.input_variables, item?.inputs, ""),
    outputVariables: firstDefined(item?.output_variables, item?.outputs, ""),
  };
}

function phaseStatusLabel(status) {
  const normalized = String(status || "").toUpperCase();
  if (["READY", "ACTIVE", "ENABLED"].includes(normalized)) return "Pronta";
  if (["DRAFT", "BOZZA"].includes(normalized)) return "Bozza";
  if (["DISABLED", "INACTIVE"].includes(normalized)) return "Disabilitata";
  return status || "n/d";
}

function getLifecycle(procedure, versionsByCode) {
  const versions = getVersions(procedure, versionsByCode);
  const active = getActiveVersion(procedure, versionsByCode);
  const draft = getDraftVersion(procedure, versionsByCode);
  const historical = getDeprecatedVersions(procedure, versionsByCode);
  const latest = versions[0];

  return { versions, active, draft, historical, latest };
}

function MetricTile({ label, value, helper }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: 1.45,
        py: 1.15,
        border: "1px solid #dbe5f0",
        borderRadius: 2.4,
        bgcolor: "#ffffff",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: "#64748b",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ mt: 0.55, color: "#0f172a", fontSize: 20, fontWeight: 950, lineHeight: 1.1 }}>
        {value ?? 0}
      </Typography>
      {helper && (
        <Typography variant="caption" sx={{ mt: 0.35, display: "block", color: "#94a3b8", fontWeight: 700 }}>
          {helper}
        </Typography>
      )}
    </Box>
  );
}

function DetailField({ label, value, mono = false }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.55 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.45,
          color: "#0f172a",
          fontWeight: 850,
          lineHeight: 1.35,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
          overflowWrap: "anywhere",
        }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <Box
      sx={{
        border: "1px solid #dbe5f0",
        borderRadius: 2.7,
        bgcolor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 2, py: 1.35, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
      >
        <Icon sx={{ fontSize: 18, color: "#2563eb" }} />
        <Typography sx={{ fontWeight: 950, color: "#0f172a" }}>{title}</Typography>
      </Stack>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}

function LifecycleChip({ active, draft }) {
  if (active) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label={`Attiva ${active.version || ""}`}
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontWeight: 900, bgcolor: "#f0fdf4" }}
      />
    );
  }

  if (draft) {
    return (
      <Chip
        icon={<EditOutlinedIcon />}
        label={`Bozza ${draft.version || ""}`}
        size="small"
        color="warning"
        variant="outlined"
        sx={{ fontWeight: 900, bgcolor: "#fffbeb" }}
      />
    );
  }

  return <Chip label="Storica" size="small" variant="outlined" sx={{ fontWeight: 900, bgcolor: "#f8fafc" }} />;
}

function HeaderSummary({ procedure, versionsByCode }) {
  const code = procedureCode(procedure);
  const { versions, active, draft, latest } = getLifecycle(procedure, versionsByCode);
  const phases = getPhaseCount(latest);
  const variables = getVariableCount(latest);

  return (
    <Box sx={{ mt: 1.45 }}>
      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center">
        <Chip
          label={code}
          size="small"
          sx={{
            maxWidth: "100%",
            bgcolor: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            fontWeight: 950,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
          }}
        />
        <LifecycleChip active={active} draft={draft} />
      </Stack>

      <Box
        sx={{
          mt: 1.35,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1,
        }}
      >
        <MetricTile label="Versioni" value={versions.length} />
        <MetricTile label="Fasi" value={phases} />
        <MetricTile label="Variabili" value={variables} />
      </Box>
    </Box>
  );
}

function OverviewTab({ procedure, versionsByCode }) {
  const code = procedureCode(procedure);
  const { versions, active, draft, historical, latest } = getLifecycle(procedure, versionsByCode);
  const phases = getPhaseCount(latest);
  const variables = getVariableCount(latest);
  const executions = getExecutionCount(procedure, latest);

  return (
    <Stack spacing={1.6}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 1,
          "@media (max-width: 760px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <MetricTile label="Versioni" value={versions.length} helper={active ? `Attiva ${active.version || ""}` : "Nessuna attiva"} />
        <MetricTile label="Fasi" value={phases} helper="Ultima versione" />
        <MetricTile label="Variabili" value={variables} helper="Input e output" />
        <MetricTile label="Esecuzioni" value={executions} helper="Disponibili" />
      </Box>

      <SectionCard title="Panoramica" icon={FactCheckOutlinedIcon}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
          <DetailField label="Codice" value={code} mono />
          <DetailField label="Stato" value={active ? `Attiva ${active.version || ""}` : draft ? `Bozza ${draft.version || ""}` : "Storica"} />
          <DetailField
            label="Trigger"
            value={firstDefined(latest?.trigger_type, latest?.trigger, procedure?.trigger_type, procedure?.trigger)}
          />
          <DetailField
            label="Categoria"
            value={firstDefined(latest?.category, procedure?.category, procedure?.group_name)}
          />
          <DetailField
            label="Modalità esecuzione"
            value={firstDefined(latest?.execution_mode, procedure?.execution_mode)}
          />
          <DetailField
            label="Timeout"
            value={firstDefined(latest?.timeout_seconds, procedure?.timeout_seconds)}
          />
        </Box>
      </SectionCard>

      <SectionCard title="Ciclo di vita" icon={HistoryOutlinedIcon}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
            <LifecycleChip active={active} draft={draft} />
            {historical.length > 0 && (
              <Chip label={`${historical.length} storiche`} size="small" variant="outlined" sx={{ fontWeight: 850 }} />
            )}
          </Stack>
          <Divider />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <DetailField label="Ultima modifica" value={formatDate(latest?.updated_at || latest?.created_at || procedure.updated_at)} />
            <DetailField
              label="Ultima pubblicazione"
              value={formatDate(active?.published_at || active?.updated_at || active?.created_at)}
            />
            <DetailField
              label="Autore"
              value={firstDefined(latest?.updated_by, latest?.created_by, procedure?.updated_by, procedure?.created_by)}
            />
            <DetailField label="Bozza corrente" value={draft?.version} />
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title="Descrizione" icon={AccountTreeOutlinedIcon}>
        <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.7, fontWeight: 650 }}>
          {operatorDescription(procedure)}
        </Typography>
      </SectionCard>
    </Stack>
  );
}


const VERSION_STATUS_LABEL = {
  DRAFT: "Bozza",
  ACTIVE: "Attiva",
  PUBLISHED: "Attiva",
  DEPRECATED: "Storica",
  HISTORICAL: "Storica",
  ARCHIVED: "Storica",
};

function versionStatus(version) {
  return VERSION_STATUS_LABEL[version?.status] || version?.status || "n/d";
}

function versionStatusColor(version) {
  const status = versionStatus(version);
  if (status === "Attiva") return "success";
  if (status === "Bozza") return "warning";
  return "default";
}

function versionDate(version) {
  return formatDate(
    firstDefined(
      version?.published_at,
      version?.updated_at,
      version?.created_at,
    ),
  );
}

function parseVersion(value) {
  const match = String(value || "").match(/^v?(\d+)\.(\d+)$/i);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function suggestNextVersion(sourceVersion) {
  const parsed = parseVersion(sourceVersion);
  if (!parsed) return "v1.0";
  return `v${parsed.major}.${parsed.minor + 1}`;
}

function PublishDialog({ open, version, activeVersion, saving, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pubblica bozza</DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning">
          La bozza {version || "selezionata"} diventerà la versione attiva.
          {activeVersion ? ` La versione attualmente attiva (${activeVersion}) diventerà storica.` : ""}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 850 }}>
          Annulla
        </Button>
        <Button disabled={saving || !version} variant="contained" onClick={onConfirm} sx={{ textTransform: "none", fontWeight: 900 }}>
          {saving ? "Pubblicazione..." : "Pubblica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CloneDialog({ open, sourceVersion, saving, onClose, onConfirm }) {
  const [targetVersion, setTargetVersion] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTargetVersion(suggestNextVersion(sourceVersion));
      setNotes("");
    }
  }, [open, sourceVersion]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Duplica versione</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">La versione {sourceVersion || "selezionata"} sarà clonata come nuova bozza.</Alert>
          <TextField
            label="Nuova versione"
            value={targetVersion}
            onChange={(event) => setTargetVersion(event.target.value)}
            placeholder="v1.5"
            size="small"
            fullWidth
          />
          <TextField
            label="Note"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={3}
            size="small"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 850 }}>
          Annulla
        </Button>
        <Button
          disabled={saving || !sourceVersion || !targetVersion.trim()}
          variant="contained"
          onClick={() => onConfirm({ target_version: targetVersion.trim(), notes })}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          {saving ? "Clonazione..." : "Duplica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function VersionTimelineItem({ version, isLast, saving, activeAction, onOpen, onPublish, onClone }) {
  const status = versionStatus(version);
  const isDraft = status === "Bozza";
  const versionKey = version?.version || version?.id;
  const publishing = saving && activeAction?.type === "publish" && activeAction?.version === versionKey;
  const cloning = saving && activeAction?.type === "clone" && activeAction?.version === versionKey;

  return (
    <Box sx={{ position: "relative", pl: 4 }}>
      {!isLast && (
        <Box sx={{ position: "absolute", left: 12, top: 28, bottom: -18, width: 2, bgcolor: "#dbe5f0" }} />
      )}
      <Box
        sx={{
          position: "absolute",
          left: 4,
          top: 10,
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: status === "Attiva" ? "#16a34a" : status === "Bozza" ? "#f59e0b" : "#94a3b8",
          border: "4px solid #ffffff",
          boxShadow: "0 0 0 1px #cbd5e1",
        }}
      />

      <Box
        sx={{
          border: "1px solid #dbe5f0",
          borderRadius: 2.7,
          bgcolor: "#ffffff",
          p: 1.7,
          transition: "border-color 140ms ease, box-shadow 140ms ease",
          "&:hover": { borderColor: "#bfdbfe", boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)" },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography sx={{ color: "#0f172a", fontSize: 17, fontWeight: 950 }}>{version?.version || "n/d"}</Typography>
              <Chip
                label={status}
                size="small"
                color={versionStatusColor(version)}
                variant="outlined"
                sx={{ height: 24, fontWeight: 900, bgcolor: status === "Attiva" ? "#f0fdf4" : status === "Bozza" ? "#fffbeb" : "#f8fafc" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ mt: 0.45, display: "block", color: "#64748b", fontWeight: 750 }}>
              {versionDate(version)}
              {firstDefined(version?.updated_by, version?.created_by) ? ` · ${firstDefined(version?.updated_by, version?.created_by)}` : ""}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 1.35, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
          <MetricTile label="Fasi" value={getPhaseCount(version)} />
          <MetricTile label="Variabili" value={getVariableCount(version)} />
        </Box>

        <Stack direction="row" spacing={0.6} justifyContent="flex-end" useFlexGap flexWrap="wrap" sx={{ mt: 1.35 }}>
          <Button size="small" startIcon={<VisibilityIcon />} onClick={() => onOpen(version)} sx={{ textTransform: "none", fontWeight: 850 }}>
            Apri
          </Button>
          <Button
            size="small"
            startIcon={cloning ? <CircularProgress size={15} /> : <ContentCopyIcon />}
            disabled={saving}
            onClick={() => onClone(version)}
            sx={{ textTransform: "none", fontWeight: 850 }}
          >
            {cloning ? "Duplicazione..." : "Duplica"}
          </Button>
          {isDraft && (
            <Button
              size="small"
              variant="contained"
              startIcon={publishing ? <CircularProgress size={15} color="inherit" /> : <PublishIcon />}
              disabled={saving}
              onClick={() => onPublish(version)}
              sx={{ textTransform: "none", fontWeight: 900, boxShadow: "none" }}
            >
              {publishing ? "Pubblicazione..." : "Pubblica"}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function VersionsWorkspace({ procedure, versionsByCode, saving, activeAction, error, onClearError, onOpenDetail, onOpenVersions, onPublish, onClone }) {
  const { versions, active, draft, historical } = getLifecycle(procedure, versionsByCode);
  const [publishVersion, setPublishVersion] = useState(null);
  const [cloneVersion, setCloneVersion] = useState(null);

  return (
    <Stack spacing={1.6}>
      {error && (
        <Alert severity="error" onClose={onClearError}>{error}</Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
        <MetricTile label="Attiva" value={active?.version || "-"} />
        <MetricTile label="Bozza" value={draft?.version || "-"} />
        <MetricTile label="Storiche" value={historical.length} />
      </Box>

      <SectionCard title="Timeline versioni" icon={HistoryOutlinedIcon}>
        {saving && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: "#64748b" }}>
            <CircularProgress size={18} />
            <Typography variant="body2" sx={{ fontWeight: 800 }}>Aggiornamento versioni...</Typography>
          </Stack>
        )}

        {versions.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography sx={{ color: "#64748b", fontWeight: 800 }}>Nessuna versione disponibile.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.7}>
            {versions.map((version, index) => (
              <VersionTimelineItem
                key={version?.id || version?.version || index}
                version={version}
                isLast={index === versions.length - 1}
                saving={saving}
                activeAction={activeAction}
                onOpen={(item) => onOpenDetail?.(procedure, item?.version)}
                onPublish={setPublishVersion}
                onClone={setCloneVersion}
              />
            ))}
          </Stack>
        )}
      </SectionCard>

      <Button
        variant="outlined"
        startIcon={<HistoryOutlinedIcon />}
        onClick={() => onOpenVersions?.(procedure)}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 900 }}
      >
        Apri gestione completa
      </Button>

      <PublishDialog
        open={Boolean(publishVersion)}
        version={publishVersion?.version}
        activeVersion={active?.version}
        saving={saving}
        onClose={() => setPublishVersion(null)}
        onConfirm={async () => {
          const ok = await onPublish(publishVersion);
          if (ok) setPublishVersion(null);
        }}
      />
      <CloneDialog
        open={Boolean(cloneVersion)}
        sourceVersion={cloneVersion?.version}
        saving={saving}
        onClose={() => setCloneVersion(null)}
        onConfirm={async (payload) => {
          const ok = await onClone(cloneVersion, payload);
          if (ok) setCloneVersion(null);
        }}
      />
    </Stack>
  );
}

const EMPTY_TAB_CONTENT = {
  variables: {
    icon: DataObjectOutlinedIcon,
    title: "Variabili",
    text: "Input, output e variabili della procedura saranno collegati in uno step successivo.",
  },
  executions: {
    icon: PlayArrowIcon,
    title: "Esecuzioni",
    text: "Le esecuzioni recenti saranno mostrate qui mantenendo il collegamento con l’Execution Center.",
  },
  audit: {
    icon: FactCheckOutlinedIcon,
    title: "Audit",
    text: "La cronologia delle modifiche sarà disponibile quando il relativo endpoint sarà esposto.",
  },
};

function DeferredTab({ type, onOpenVersions }) {
  const config = EMPTY_TAB_CONTENT[type];
  const Icon = config.icon;

  return (
    <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2.7, p: 3, textAlign: "center", bgcolor: "#f8fafc" }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2.7,
          mx: "auto",
          bgcolor: "#eff6ff",
          color: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon />
      </Box>
      <Typography sx={{ mt: 1.5, fontWeight: 950, color: "#0f172a" }}>{config.title}</Typography>
      <Typography variant="body2" sx={{ mt: 0.8, color: "#64748b", lineHeight: 1.6 }}>
        {config.text}
      </Typography>
      {type === "versions" && (
        <Button onClick={onOpenVersions} sx={{ mt: 1.5, textTransform: "none", fontWeight: 900 }}>
          Apri gestione versioni
        </Button>
      )}
    </Box>
  );
}

function TabLabel({ label, count }) {
  return (
    <Stack direction="row" spacing={0.65} alignItems="center">
      <Box component="span">{label}</Box>
      {Number(count) > 0 && (
        <Box
          component="span"
          sx={{
            minWidth: 20,
            height: 20,
            px: 0.65,
            borderRadius: 10,
            bgcolor: "#eef2f7",
            color: "#475569",
            fontSize: 11,
            lineHeight: "20px",
            fontWeight: 950,
            textAlign: "center",
          }}
        >
          {count}
        </Box>
      )}
    </Stack>
  );
}

export default function ProcedureDrawer360({ open, procedure, versionsByCode, onClose, onOpenDetail, onOpenVersions, onOpenExecutionCenter }) {
  const [tab, setTab] = useState("overview");
  const [runtimeProcedure, setRuntimeProcedure] = useState(procedure);
  const [runtimeVersions, setRuntimeVersions] = useState([]);
  const [actionSaving, setActionSaving] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const [phaseItems, setPhaseItems] = useState([]);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [phaseError, setPhaseError] = useState("");
  const [phaseLoadedKey, setPhaseLoadedKey] = useState("");
  const [variableItems, setVariableItems] = useState([]);
  const [variableLoading, setVariableLoading] = useState(false);
  const [variableError, setVariableError] = useState("");
  const [variableLoadedKey, setVariableLoadedKey] = useState("");
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });

  const inputCode = procedure ? procedureCode(procedure) : "";

  useEffect(() => {
    setRuntimeProcedure(procedure);
    setRuntimeVersions(procedure ? getVersions(procedure, versionsByCode) : []);
    setActionError("");
    setActiveAction(null);
    setPhaseItems([]);
    setPhaseError("");
    setPhaseLoadedKey("");
    setVariableItems([]);
    setVariableError("");
    setVariableLoadedKey("");
  }, [procedure, versionsByCode]);

  const code = runtimeProcedure ? procedureCode(runtimeProcedure) : inputCode;
  const effectiveVersionsByCode = useMemo(
    () => ({ ...(versionsByCode || {}), [code]: runtimeVersions }),
    [versionsByCode, code, runtimeVersions],
  );
  const lifecycle = useMemo(
    () => (runtimeProcedure ? getLifecycle(runtimeProcedure, effectiveVersionsByCode) : { versions: [], active: null, draft: null, latest: null }),
    [runtimeProcedure, effectiveVersionsByCode],
  );
  const preferredVersion = runtimeProcedure?.draft_version || runtimeProcedure?.active_version || lifecycle.versions[0]?.version || "v1.0";
  const phaseCount = getPhaseCount(lifecycle.latest);
  const variableCount = getVariableCount(lifecycle.latest);
  const executionCount = getExecutionCount(runtimeProcedure, lifecycle.latest);

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "versions", label: "Versioni", count: lifecycle.versions.length },
    { value: "phases", label: "Fasi", count: phaseCount },
    { value: "variables", label: "Variabili", count: variableCount },
    { value: "executions", label: "Esecuzioni", count: executionCount },
    { value: "audit", label: "Audit" },
  ];

  const refreshVersions = async () => {
    if (!code) return;
    const [procedureResponse, versionsResponse] = await Promise.all([
      fetch(`/api/v1/procedures/${code}`),
      fetch(`/api/v1/procedures/${code}/versions`),
    ]);

    if (!procedureResponse.ok || !versionsResponse.ok) {
      throw new Error("Operazione completata, ma non è stato possibile aggiornare il Drawer.");
    }

    const procedurePayload = await procedureResponse.json();
    const versionsPayload = await versionsResponse.json();
    setRuntimeProcedure(procedurePayload?.item || procedurePayload || runtimeProcedure);
    setRuntimeVersions(Array.isArray(versionsPayload?.items) ? versionsPayload.items : []);
  };

  const phaseVersion = lifecycle.draft?.version || lifecycle.active?.version || lifecycle.versions[0]?.version || preferredVersion;

  const loadPhases = async (force = false) => {
    if (!code || !phaseVersion) return;
    const loadKey = `${code}:${phaseVersion}`;
    if (!force && phaseLoadedKey === loadKey) return;

    setPhaseLoading(true);
    setPhaseError("");
    try {
      const response = await fetch(`/api/v1/procedures/${code}/versions/${phaseVersion}`);
      if (!response.ok) throw new Error(`Errore caricamento fasi (${response.status})`);
      const payload = await response.json();
      const rawPhases = Array.isArray(payload?.phases)
        ? payload.phases
        : Array.isArray(payload?.version?.phases)
          ? payload.version.phases
          : [];
      setPhaseItems(rawPhases.map(normalizePhase).sort((a, b) => a.order - b.order));
      setPhaseLoadedKey(loadKey);
    } catch (error) {
      setPhaseItems([]);
      setPhaseError(error?.message || "Errore durante il caricamento delle fasi.");
    } finally {
      setPhaseLoading(false);
    }
  };

  useEffect(() => {
    if (open && tab === "phases") loadPhases();
  }, [open, tab, code, phaseVersion]);

  const loadVariables = async (force = false) => {
    if (!code || !phaseVersion) return;
    const loadKey = `${code}:${phaseVersion}`;
    if (!force && variableLoadedKey === loadKey) return;

    setVariableLoading(true);
    setVariableError("");
    try {
      const response = await fetch(`/api/v1/procedures/${code}/versions/${phaseVersion}`);
      if (!response.ok) throw new Error(`Errore caricamento variabili (${response.status})`);
      const payload = await response.json();
      setVariableItems(extractVariables(payload));
      setVariableLoadedKey(loadKey);
    } catch (error) {
      setVariableItems([]);
      setVariableError(error?.message || "Errore durante il caricamento delle variabili.");
    } finally {
      setVariableLoading(false);
    }
  };

  useEffect(() => {
    if (open && tab === "variables") loadVariables();
  }, [open, tab, code, phaseVersion]);

  const handlePublishVersion = async (version) => {
    if (!version?.version || !code) return false;
    setActionSaving(true);
    setActiveAction({ type: "publish", version: version.version });
    setActionError("");
    try {
      await publishProcedureVersion(code, version.version, { requested_by: "Admin Proximity", force: false });
      await refreshVersions();
      setNotice({ open: true, severity: "success", message: `Versione ${version.version} pubblicata correttamente.` });
      return true;
    } catch (error) {
      const message = error?.message || "Errore durante la pubblicazione della bozza.";
      setActionError(message);
      setNotice({ open: true, severity: "error", message });
      return false;
    } finally {
      setActionSaving(false);
      setActiveAction(null);
    }
  };

  const handleCloneVersion = async (version, payload) => {
    if (!version?.version || !code) return false;
    setActionSaving(true);
    setActiveAction({ type: "clone", version: version.version });
    setActionError("");
    try {
      await cloneProcedureVersion(code, version.version, { requested_by: "Admin Proximity", ...payload });
      await refreshVersions();
      setNotice({ open: true, severity: "success", message: `Versione ${version.version} duplicata come ${payload.target_version}.` });
      return true;
    } catch (error) {
      const message = error?.message || "Errore durante la duplicazione della versione.";
      setActionError(message);
      setNotice({ open: true, severity: "error", message });
      return false;
    } finally {
      setActionSaving(false);
      setActiveAction(null);
    }
  };

  const handleClose = () => {
    setTab("overview");
    setActionError("");
    onClose?.();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 600, lg: 660 },
          maxWidth: "100vw",
          overflowX: "hidden",
          bgcolor: "#f6f8fb",
          borderLeft: "1px solid #dbe5f0",
          boxShadow: "-18px 0 48px rgba(15, 23, 42, 0.14)",
        },
      }}
    >
      {runtimeProcedure && (
        <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ px: 2.5, pt: 2.25, pb: 0, bgcolor: "#ffffff", borderBottom: "1px solid #dbe5f0" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="overline"
                  sx={{ color: "#2563eb", fontWeight: 950, letterSpacing: 1.05, lineHeight: 1.2 }}
                >
                  Procedura automatica
                </Typography>
                <Typography sx={{ mt: 0.35, fontSize: { xs: 22, sm: 25 }, fontWeight: 950, color: "#0f172a", lineHeight: 1.18 }}>
                  {operatorName(code, runtimeProcedure.name)}
                </Typography>
                <HeaderSummary procedure={runtimeProcedure} versionsByCode={effectiveVersionsByCode} />
              </Box>
              <IconButton
                onClick={handleClose}
                aria-label="Chiudi drawer"
                sx={{ mt: -0.4, mr: -0.75, color: "#64748b", "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" } }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>

            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mt: 1.7,
                minHeight: 42,
                "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
                "& .MuiTab-root": {
                  minHeight: 42,
                  px: 1.35,
                  color: "#64748b",
                  textTransform: "none",
                  fontWeight: 900,
                },
                "& .Mui-selected": { color: "#1565d8" },
              }}
            >
              {tabs.map((item) => (
                <Tab key={item.value} value={item.value} label={<TabLabel label={item.label} count={item.count} />} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 2.25, minWidth: 0 }}>
            {tab === "overview" && (
              <OverviewTab procedure={runtimeProcedure} versionsByCode={effectiveVersionsByCode} />
            )}
            {tab === "versions" && (
              <VersionsWorkspace
                procedure={runtimeProcedure}
                versionsByCode={effectiveVersionsByCode}
                saving={actionSaving}
                activeAction={activeAction}
                error={actionError}
                onClearError={() => setActionError("")}
                onOpenDetail={onOpenDetail}
                onOpenVersions={onOpenVersions}
                onPublish={handlePublishVersion}
                onClone={handleCloneVersion}
              />
            )}
            {tab === "phases" && (
              <PhasesWorkspace
                procedure={runtimeProcedure}
                version={phaseVersion}
                phases={phaseItems}
                loading={phaseLoading}
                error={phaseError}
                onRetry={() => loadPhases(true)}
                onOpenDetail={onOpenDetail}
              />
            )}
            {tab === "variables" && (
              <VariablesWorkspace
                procedure={runtimeProcedure}
                version={phaseVersion}
                variables={variableItems}
                loading={variableLoading}
                error={variableError}
                onRetry={() => loadVariables(true)}
                onOpenDetail={onOpenDetail}
              />
            )}
            {tab === "executions" && (
              <ExecutionsWorkspace
                procedureCode={code}
                onOpenExecutionCenter={() => onOpenExecutionCenter?.(runtimeProcedure)}
              />
            )}
            {!['overview', 'versions', 'phases', 'variables', 'executions'].includes(tab) && (
              <DeferredTab type={tab} onOpenVersions={() => onOpenVersions?.(runtimeProcedure)} />
            )}
          </Box>

          <Box sx={{ px: 2.25, py: 1.25, bgcolor: "#ffffff", borderTop: "1px solid #dbe5f0" }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
              <Button
                size="small"
                onClick={() => onOpenVersions?.(procedure)}
                startIcon={<HistoryOutlinedIcon />}
                sx={{ textTransform: "none", fontWeight: 900, px: 1.35 }}
              >
                Versioni
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={() => onOpenDetail?.(runtimeProcedure, preferredVersion)}
                sx={{ textTransform: "none", fontWeight: 900, boxShadow: "none", px: 1.6 }}
              >
                Apri dettaglio
              </Button>
            </Stack>
          </Box>

          <Snackbar
            open={notice.open}
            autoHideDuration={4200}
            onClose={() => setNotice((current) => ({ ...current, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              severity={notice.severity}
              variant="filled"
              onClose={() => setNotice((current) => ({ ...current, open: false }))}
              sx={{ width: "100%", fontWeight: 800 }}
            >
              {notice.message}
            </Alert>
          </Snackbar>
        </Box>
      )}
    </Drawer>
  );
}
