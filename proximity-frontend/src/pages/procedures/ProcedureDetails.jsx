import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryIcon from "@mui/icons-material/History";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import AppLayout from "../../components/layout/AppLayout";
import { getProcedure, listVersions } from "../../services/procedureService";

function operatorName(code, fallback) {
  const names = {
    FIRST_SERVICE_PROVISIONING: "Prima attivazione servizio",
    ROUTER_REPLACEMENT: "Sostituzione router",
    DEVICE_REBOOT: "Riavvio router",
  };

  return names[code] || fallback || code;
}

function operatorDescription(procedure) {
  const descriptions = {
    FIRST_SERVICE_PROVISIONING:
      "Provisioning automatico iniziale di un nuovo servizio cliente.",
    ROUTER_REPLACEMENT:
      "Procedura per sostituzione router e riallineamento configurazione.",
    DEVICE_REBOOT: "Riavvio remoto controllato del router cliente.",
  };

  return (
    descriptions[procedure?.definition_code]
    || procedure?.description
    || "Nessuna descrizione disponibile."
  );
}

function statusLabel(status) {
  if (status === "ACTIVE") return "Attiva";
  if (status === "PUBLISHED") return "Attiva";
  if (status === "DRAFT") return "Bozza";
  if (status === "DEPRECATED") return "Storica";
  return status || "-";
}

function statusColor(status) {
  if (status === "ACTIVE" || status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "DEPRECATED") return "default";
  return "default";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (_) {
    return "-";
  }
}

function getPublishedVersion(versions) {
  return versions.find((version) => version.status === "PUBLISHED");
}

function getDraftVersion(versions) {
  return versions.find((version) => version.status === "DRAFT");
}

function getStepsCount(version) {
  return version?.definition_json?.steps?.length || 0;
}

function InfoTile({ label, value }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 950 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.7, fontSize: 17, fontWeight: 950 }}>
          {value || "-"}
        </Typography>
      </CardContent>
    </Card>
  );
}

function HeaderCard({ procedure, versions, onBack }) {
  const published = getPublishedVersion(versions);
  const draft = getDraftVersion(versions);
  const stepsCount = getStepsCount(published);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(255,255,255,1) 44%)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={2.5}
        >
          <Stack direction="row" spacing={1.8} alignItems="flex-start">
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 3.5,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArticleOutlinedIcon sx={{ fontSize: 30 }} />
            </Box>

            <Box>
              <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950 }}>
                {operatorName(procedure.definition_code, procedure.name)}
              </Typography>

              <Typography sx={{ color: "#64748b", mt: 0.7, fontSize: 15.5 }}>
                {operatorDescription(procedure)}
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={statusLabel(procedure.status)}
                  color={statusColor(procedure.status)}
                  variant="outlined"
                  sx={{ fontWeight: 900 }}
                />

                {published && (
                  <Chip
                    label={`Versione attiva ${published.version}`}
                    variant="outlined"
                    sx={{ fontWeight: 900 }}
                  />
                )}

                {draft && (
                  <Chip
                    icon={<EditNoteIcon />}
                    label={`Bozza ${draft.version}`}
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 900 }}
                  />
                )}

                <Chip
                  label={`${stepsCount || "-"} fasi`}
                  variant="outlined"
                  sx={{ fontWeight: 900 }}
                />
              </Stack>
            </Box>
          </Stack>

          <Button
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{
              borderRadius: 2.4,
              fontWeight: 900,
              textTransform: "none",
              alignSelf: { xs: "flex-start", md: "center" },
            }}
          >
            Torna alla libreria
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProcedureTabs({ procedure, versions }) {
  const navigate = useNavigate();
  const published = getPublishedVersion(versions);
  const draft = getDraftVersion(versions);
  const stepsCount = getStepsCount(published);

  return (
    <Card
      elevation={0}
      sx={{ borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}
    >
      <Box sx={{ px: 2, borderBottom: "1px solid #e2e8f0" }}>
        <Tabs value={0} variant="scrollable" scrollButtons="auto">
          <Tab label="Informazioni" />
          <Tab label="Versioni" onClick={() => navigate(`/procedures/${procedure.definition_code}/versions`)} />
          <Tab label="Editor" onClick={() => navigate(`/procedures/${procedure.definition_code}/editor`)} />
          <Tab label="Statistiche" />
          <Tab label="Cronologia" />
        </Tabs>
      </Box>

      <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 950 }}>
              Carta d'identità della procedura
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              Questa sezione descrive il template di automazione e il suo ciclo di vita.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Evento di attivazione" value={procedure.definition_code} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Nome tecnico" value={procedure.name} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Stato" value={statusLabel(procedure.status)} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Versione attiva" value={published?.version || "-"} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Bozza" value={draft?.version || "Nessuna"} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Fasi pubblicate" value={stepsCount || "-"} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Versioni totali" value={versions.length} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Creata il" value={formatDate(procedure.created_at)} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <InfoTile label="Ultima modifica" value={formatDate(procedure.updated_at)} />
            </Grid>
          </Grid>

          <Divider />

          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 950, mb: 1 }}>
              Descrizione
            </Typography>
            <Typography sx={{ color: "#475569", lineHeight: 1.7 }}>
              {operatorDescription(procedure)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
      <CardContent sx={{ p: 5, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
          Caricamento procedura automatica...
        </Typography>
      </CardContent>
    </Card>
  );
}

function NotFoundState({ definitionCode }) {
  return (
    <Alert severity="warning" sx={{ borderRadius: 3, fontWeight: 800 }}>
      Procedura non trovata: {definitionCode}
    </Alert>
  );
}

export default function ProcedureDetails() {
  const { definitionCode } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadProcedure() {
      setLoading(true);

      try {
        const [procedureData, versionsData] = await Promise.all([
          getProcedure(definitionCode),
          listVersions(definitionCode),
        ]);

        if (!mounted) return;

        setProcedure(procedureData || null);
        setVersions(versionsData.items || []);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProcedure();

    return () => {
      mounted = false;
    };
  }, [definitionCode]);

  const breadcrumbLabel = useMemo(() => {
    if (!procedure) return definitionCode;
    return operatorName(procedure.definition_code, procedure.name);
  }, [procedure, definitionCode]);

  return (
    <AppLayout>
      <Box sx={{ width: "100%", maxWidth: 1700, mx: "auto", px: { xs: 0, md: 1 } }}>
        <Stack spacing={2.5}>
          <Breadcrumbs>
            <RouterLink
              to="/procedures"
              style={{ textDecoration: "none", color: "#2563eb", fontWeight: 800 }}
            >
              Procedure Automatiche
            </RouterLink>
            <Typography sx={{ color: "#64748b", fontWeight: 800 }}>
              {breadcrumbLabel}
            </Typography>
          </Breadcrumbs>

          {loading && <LoadingState />}

          {!loading && error && (
            <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 800 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && !procedure && <NotFoundState definitionCode={definitionCode} />}

          {!loading && !error && procedure && (
            <>
              <HeaderCard
                procedure={procedure}
                versions={versions}
                onBack={() => navigate("/procedures")}
              />

              <ProcedureTabs procedure={procedure} versions={versions} />
            </>
          )}
        </Stack>
      </Box>
    </AppLayout>
  );
}
