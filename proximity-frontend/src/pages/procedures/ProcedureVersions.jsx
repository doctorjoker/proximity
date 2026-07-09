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
  IconButton,
  LinearProgress,
  Paper,
  Stack,
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublishIcon from "@mui/icons-material/Publish";
import RestoreIcon from "@mui/icons-material/Restore";
import VisibilityIcon from "@mui/icons-material/Visibility";

import {
  publishProcedureVersion,
  cloneProcedureVersion,
} from "../../services/publishService";

const statusLabel = {
  DRAFT: "Bozza",
  ACTIVE: "Attiva",
  DEPRECATED: "Storica",
  HISTORICAL: "Storica",
  ARCHIVED: "Storica",
};

const statusColor = {
  Bozza: "warning",
  Attiva: "success",
  Storica: "default",
};

function normalizeStatus(status) {
  return statusLabel[status] || status || "n/d";
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

function formatTime(value) {
  if (!value) return "n/d";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function versionNumber(value) {
  const match = String(value || "").match(/^v(\d+)\.(\d+)$/i);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function suggestNextVersion(activeVersion, draftVersion) {
  const base = versionNumber(draftVersion) || versionNumber(activeVersion);
  if (!base) return "v1.0";
  return `v${base.major}.${base.minor + 1}`;
}

function StatCard({ label, value, helper }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ p: 2.2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={900}>
          {value ?? "n/d"}
        </Typography>
        {helper && (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function HeaderActionButton({ children, startIcon, variant = "outlined", onClick, disabled }) {
  return (
    <Button
      size="small"
      variant={variant}
      startIcon={startIcon}
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 40,
        minWidth: 118,
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

function ResultDialog({ open, title, result, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {result && (
          <Stack spacing={2}>
            <Alert severity="success">Operazione completata correttamente</Alert>
            <TextField
              fullWidth
              multiline
              minRows={8}
              value={JSON.stringify(result, null, 2)}
              InputProps={{ readOnly: true }}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PublishDraftDialog({ open, draftVersion, saving, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pubblica bozza</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning">
            Pubblicando la bozza {draftVersion}, questa diventerà la versione attiva. L'eventuale versione attiva precedente diventerà storica.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Annulla
        </Button>
        <Button disabled={saving || !draftVersion || draftVersion === "n/d"} variant="contained" onClick={onConfirm} sx={{ textTransform: "none", fontWeight: 850 }}>
          {saving ? "Pubblicazione..." : "Pubblica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CloneVersionDialog({ open, sourceVersion, suggestedVersion, saving, onClose, onConfirm }) {
  const [targetVersion, setTargetVersion] = useState(suggestedVersion || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTargetVersion(suggestedVersion || "");
      setNotes("");
    }
  }, [open, suggestedVersion]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Duplica versione</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">Clona {sourceVersion} come nuova bozza.</Alert>
          <TextField
            label="Nuova versione"
            value={targetVersion}
            onChange={(event) => setTargetVersion(event.target.value)}
            placeholder="v1.5"
            fullWidth
            size="small"
          />
          <TextField
            label="Note"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>
          Annulla
        </Button>
        <Button
          disabled={saving || !targetVersion.trim() || !sourceVersion || sourceVersion === "n/d"}
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

export default function ProcedureVersions() {
  const params = useParams();
  const navigate = useNavigate();
  const procedureCode = params.definitionCode || params.procedureCode || "PROC-ROUTER-REPLACEMENT";

  const [procedure, setProcedure] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionTitle, setActionTitle] = useState("Risultato");

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [procedureResponse, versionsResponse] = await Promise.all([
        fetch(`/api/v1/procedures/${procedureCode}`),
        fetch(`/api/v1/procedures/${procedureCode}/versions`),
      ]);

      if (!procedureResponse.ok) {
        throw new Error(`Errore caricamento procedura (${procedureResponse.status})`);
      }

      if (!versionsResponse.ok) {
        throw new Error(`Errore caricamento versioni (${versionsResponse.status})`);
      }

      const procedurePayload = await procedureResponse.json();
      const versionsPayload = await versionsResponse.json();

      setProcedure(procedurePayload.item || versionsPayload.procedure || null);
      setVersions(Array.isArray(versionsPayload.items) ? versionsPayload.items : []);
    } catch (err) {
      setError(err.message || "Errore imprevisto durante il caricamento delle versioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [procedureCode]);

  const activeVersion = procedure?.active_version || "n/d";
  const draftVersion = procedure?.draft_version || "n/d";
  const lastUpdate = procedure?.updated_at ? formatDate(procedure.updated_at) : "n/d";
  const sourceVersionForClone = draftVersion !== "n/d" ? draftVersion : activeVersion;
  const suggestedCloneVersion = suggestNextVersion(activeVersion, draftVersion !== "n/d" ? draftVersion : activeVersion);

  const totalPhases = useMemo(
    () => versions.reduce((sum, item) => sum + Number(item.phase_count || 0), 0),
    [versions],
  );

  const totalVariables = useMemo(
    () => versions.reduce((sum, item) => sum + Number(item.variable_count || 0), 0),
    [versions],
  );

  const handlePublishDraft = async () => {
    if (!draftVersion || draftVersion === "n/d") {
      setError("Nessuna bozza disponibile da pubblicare.");
      return;
    }

    setActionSaving(true);
    try {
      const result = await publishProcedureVersion(procedure?.code || procedureCode, draftVersion, {
        requested_by: "Admin Proximity",
        force: false,
      });
      setPublishDialogOpen(false);
      setActionTitle("Pubblicazione bozza");
      setActionResult(result);
      await loadData();
      setError(null);
    } catch (err) {
      setError(err.message || "Errore pubblicazione bozza.");
    } finally {
      setActionSaving(false);
    }
  };

  const handleCloneVersion = async ({ target_version, notes }) => {
    if (!sourceVersionForClone || sourceVersionForClone === "n/d") {
      setError("Nessuna versione disponibile da duplicare.");
      return;
    }

    setActionSaving(true);
    try {
      const result = await cloneProcedureVersion(procedure?.code || procedureCode, sourceVersionForClone, {
        requested_by: "Admin Proximity",
        target_version,
        notes,
      });
      setCloneDialogOpen(false);
      setActionTitle("Clonazione versione");
      setActionResult(result);
      await loadData();
      setError(null);
    } catch (err) {
      setError(err.message || "Errore clonazione versione.");
    } finally {
      setActionSaving(false);
    }
  };

  const openDraft = () => {
    if (draftVersion && draftVersion !== "n/d") {
      navigate(`/procedures/${procedure?.code || procedureCode}/versions/${draftVersion}`);
    }
  };

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1480, mx: "auto" }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(135deg, rgba(30,90,168,0.10), rgba(255,122,0,0.08))",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1.2} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    variant="text"
                    component={RouterLink}
                    to="/procedures"
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 800 }}
                  >
                    Procedure automatiche
                  </Button>
                  <Chip
                    size="small"
                    label={procedure?.category || "Categoria n/d"}
                    color="primary"
                    variant="outlined"
                  />
                  {loading && <Chip size="small" label="Caricamento dati live" variant="outlined" />}
                </Stack>

                <Box>
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.4 }}>
                    Versioni procedura
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {procedure?.name || "Procedura"} · {procedure?.code || procedureCode}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Attiva ${activeVersion}`} color="success" />
                  <Chip label={`Bozza ${draftVersion}`} color="warning" variant="outlined" />
                  <Chip label={`Trigger: ${procedure?.trigger_type || "n/d"}`} variant="outlined" />
                  <Chip label={`Owner: ${procedure?.owner || "n/d"}`} variant="outlined" />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                <HeaderActionButton
                  startIcon={<ContentCopyIcon />}
                  onClick={() => setCloneDialogOpen(true)}
                  disabled={actionSaving || sourceVersionForClone === "n/d"}
                >
                  Duplica
                </HeaderActionButton>
                <HeaderActionButton startIcon={<DownloadIcon />} disabled={actionSaving}>Esporta</HeaderActionButton>
                <HeaderActionButton
                  startIcon={actionSaving ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />}
                  variant="contained"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={actionSaving || draftVersion === "n/d"}
                >
                  Pubblica bozza
                </HeaderActionButton>
              </Stack>
            </Stack>
          </Paper>

          {error && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "error.main" }}>
              <Typography fontWeight={900} color="error">
                Errore caricamento versioni
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
            </Paper>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Versione attiva" value={activeVersion} helper="Usata dalle nuove esecuzioni" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Bozza aperta" value={draftVersion} helper="Modificabile prima della pubblicazione" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Versioni totali" value={versions.length} helper={`Fasi ${totalPhases} · Variabili ${totalVariables}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Ultimo aggiornamento" value={formatTime(procedure?.updated_at)} helper={lastUpdate} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8.5}>
              <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <HistoryIcon color="primary" />
                    <Box>
                      <Typography variant="h6" fontWeight={800}>
                        Registro versioni
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dati caricati dal backend Procedure Runtime.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Divider />

                <TableContainer>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>Versione</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell>Autore</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell align="right">Fasi</TableCell>
                        <TableCell align="right">Variabili</TableCell>
                        <TableCell align="right">Esecuzioni</TableCell>
                        <TableCell>Successo</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {versions.map((item) => {
                        const label = normalizeStatus(item.status);
                        const detailPath = `/procedures/${procedure?.code || procedureCode}/versions/${item.version}`;

                        return (
                          <TableRow key={item.version} hover>
                            <TableCell>
                              <Stack spacing={0.4}>
                                <Typography
                                  component={RouterLink}
                                  to={detailPath}
                                  fontWeight={900}
                                  color="primary"
                                  sx={{
                                    textDecoration: "none",
                                    cursor: "pointer",
                                    "&:hover": { textDecoration: "underline" },
                                  }}
                                >
                                  {item.version}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.notes || "Nessuna nota versione"}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={label}
                                color={statusColor[label] || "default"}
                                variant={label === "Storica" ? "outlined" : "filled"}
                              />
                            </TableCell>
                            <TableCell>{item.created_by || "n/d"}</TableCell>
                            <TableCell>{formatDate(item.updated_at || item.created_at)}</TableCell>
                            <TableCell align="right">{item.phase_count ?? 0}</TableCell>
                            <TableCell align="right">{item.variable_count ?? 0}</TableCell>
                            <TableCell align="right">{item.execution_count ?? 0}</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>
                              {item.success_rate == null ? (
                                <Typography variant="body2" color="text.secondary">
                                  Non disponibile
                                </Typography>
                              ) : (
                                <Stack spacing={0.7}>
                                  <Typography variant="body2" fontWeight={700}>
                                    {item.success_rate}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Number(item.success_rate)}
                                    sx={{ height: 7, borderRadius: 99 }}
                                  />
                                </Stack>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Apri dettaglio">
                                  <IconButton size="small" component={RouterLink} to={detailPath}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {label === "Bozza" && (
                                  <Tooltip title="Test esecuzione">
                                    <IconButton size="small" component={RouterLink} to={detailPath}>
                                      <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {label === "Storica" && (
                                  <Tooltip title="Ripristina come bozza">
                                    <IconButton size="small" disabled>
                                      <RestoreIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Altre azioni">
                                  <IconButton size="small">
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {!loading && versions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9}>
                            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                              Nessuna versione disponibile per questa procedura.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={3.5}>
              <Stack spacing={3}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Policy versionamento
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Bozza
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Modificabile, testabile e pubblicabile. Non viene usata dalle esecuzioni operative.
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Attiva
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Versione immutabile usata per nuove esecuzioni della procedura automatica.
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Storica
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Versione archiviata, consultabile e ripristinabile come nuova bozza.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Azioni rapide
                  </Typography>
                  <Stack spacing={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={actionSaving ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />}
                      onClick={() => setPublishDialogOpen(true)}
                      disabled={actionSaving || draftVersion === "n/d"}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      Pubblica bozza {draftVersion}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={openDraft}
                      disabled={draftVersion === "n/d"}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      Esegui test procedura
                    </Button>
                    <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} sx={{ textTransform: "none", fontWeight: 800 }}>
                      Esporta storico
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>

        <PublishDraftDialog
          open={publishDialogOpen}
          draftVersion={draftVersion}
          saving={actionSaving}
          onClose={() => setPublishDialogOpen(false)}
          onConfirm={handlePublishDraft}
        />

        <CloneVersionDialog
          open={cloneDialogOpen}
          sourceVersion={sourceVersionForClone}
          suggestedVersion={suggestedCloneVersion}
          saving={actionSaving}
          onClose={() => setCloneDialogOpen(false)}
          onConfirm={handleCloneVersion}
        />

        <ResultDialog
          open={Boolean(actionResult)}
          title={actionTitle}
          result={actionResult}
          onClose={() => setActionResult(null)}
        />
      </Box>
    </AppLayout>
  );
}
