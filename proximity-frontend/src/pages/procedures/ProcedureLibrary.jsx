import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryIcon from "@mui/icons-material/History";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";

import AppLayout from "../../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import {
  listProcedures,
  listVersions,
} from "../../services/procedureService";


const FILTERS = [
  { value: "ALL", label: "Tutte" },
  { value: "PUBLISHED", label: "Attive" },
  { value: "DRAFT", label: "Con bozza" },
  { value: "DEPRECATED", label: "Storiche" },
];

function statusLabel(status) {
  if (status === "PUBLISHED") return "Attiva";
  if (status === "DRAFT") return "Bozza";
  if (status === "DEPRECATED") return "Storica";
  return status || "-";
}

function statusColor(status) {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "DEPRECATED") return "default";
  return "default";
}

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
      "Provisioning iniziale di un nuovo servizio cliente.",
    ROUTER_REPLACEMENT:
      "Procedura per sostituzione router e riallineamento configurazione.",
    DEVICE_REBOOT: "Riavvio remoto controllato del router cliente.",
  };

  return (
    descriptions[procedure.definition_code]
    || procedure.description
    || "Nessuna descrizione disponibile."
  );
}

function getVersions(procedure, versionsByCode) {
  return versionsByCode[procedure.definition_code] || [];
}

function getActiveVersion(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).find(
    (version) => version.status === "PUBLISHED",
  );
}

function getDraftVersion(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).find(
    (version) => version.status === "DRAFT",
  );
}

function getDeprecatedVersions(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).filter(
    (version) => version.status === "DEPRECATED",
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch (_) {
    return "-";
  }
}

function ProcedureHeader() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(255,255,255,1) 42%)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 950 }}>
              Procedure Automatiche
            </Typography>

            <Typography sx={{ color: "#64748b", mt: 0.6, fontSize: 15.5 }}>
              Gestisci i modelli procedurali utilizzati da Proximity.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 3,
              fontWeight: 900,
              px: 2.5,
              py: 1.1,
              textTransform: "none",
              alignSelf: { xs: "flex-start", md: "center" },
              boxShadow: "0 12px 28px rgba(37,99,235,0.25)",
            }}
          >
            Nuova procedura
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProcedureStats({ procedures, versionsByCode }) {
  const stats = useMemo(() => {
    const activeCount = procedures.filter((procedure) =>
      Boolean(getActiveVersion(procedure, versionsByCode)),
    ).length;

    const draftCount = procedures.filter((procedure) =>
      Boolean(getDraftVersion(procedure, versionsByCode)),
    ).length;

    const historicalCount = procedures.filter((procedure) =>
      getDeprecatedVersions(procedure, versionsByCode).length > 0,
    ).length;

    return [
      {
        label: "Procedure",
        value: procedures.length,
        icon: <ArticleOutlinedIcon />,
      },
      {
        label: "Attive",
        value: activeCount,
        icon: <CheckCircleIcon />,
      },
      {
        label: "Con bozza",
        value: draftCount,
        icon: <EditNoteIcon />,
      },
      {
        label: "Storiche",
        value: historicalCount,
        icon: <HistoryIcon />,
      },
    ];
  }, [procedures, versionsByCode]);

  return (
    <Grid container spacing={2}>
      {stats.map((item) => (
        <Grid key={item.label} item xs={12} sm={6} lg={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 2.4 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 3,
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 28, fontWeight: 950, lineHeight: 1 }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontWeight: 800, mt: 0.5 }}>
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function ProcedureToolbar({ search, setSearch, filter, setFilter }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
      }}
    >
      <CardContent sx={{ p: 2.2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Cerca procedura..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 620,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                bgcolor: "#f8fafc",
                fontWeight: 700,
              },
            }}
          />

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {FILTERS.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                clickable
                color={filter === item.value ? "primary" : "default"}
                variant={filter === item.value ? "filled" : "outlined"}
                onClick={() => setFilter(item.value)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 900,
                  px: 0.5,
                }}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProcedureStatusBadge({ active, draft }) {
  if (active) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Attiva"
        color="success"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 900 }}
      />
    );
  }

  if (draft) {
    return (
      <Chip
        icon={<EditNoteIcon />}
        label="Bozza"
        color="warning"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 900 }}
      />
    );
  }

  return (
    <Chip
      label="Storica"
      color="default"
      variant="outlined"
      size="small"
      sx={{ fontWeight: 900 }}
    />
  );
}

function ProcedureCardMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Altre azioni">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setAnchorEl(event.currentTarget);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>Apri dettaglio</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Crea nuova versione</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Verifica procedura</MenuItem>
      </Menu>
    </>
  );
}

function ProcedureCard({ procedure, versionsByCode }) {
  const navigate = useNavigate();
  const versions = getVersions(procedure, versionsByCode);
  const active = getActiveVersion(procedure, versionsByCode);
  const draft = getDraftVersion(procedure, versionsByCode);
  const latestVersion = versions[0];
  const updatedAt = latestVersion?.updated_at || latestVersion?.created_at || procedure.updated_at;

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 292,
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
        boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "#bfdbfe",
          boxShadow: "0 18px 42px rgba(15,23,42,0.10)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, height: "100%" }}>
        <Stack spacing={2.1} sx={{ height: "100%" }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ArticleOutlinedIcon />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 950, lineHeight: 1.2 }}>
                  {operatorName(procedure.definition_code, procedure.name)}
                </Typography>

                <Typography
                  sx={{
                    color: "#64748b",
                    mt: 0.7,
                    fontSize: 14.5,
                    lineHeight: 1.45,
                  }}
                >
                  {operatorDescription(procedure)}
                </Typography>
              </Box>
            </Stack>

            <ProcedureCardMenu />
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <ProcedureStatusBadge active={active} draft={draft} />

            {draft && (
              <Chip
                icon={<EditNoteIcon />}
                label={`Bozza ${draft.version}`}
                color="warning"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 900 }}
              />
            )}
          </Stack>

          <Grid container spacing={1.6}>
            <Grid item xs={6}>
              <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 900 }}>
                Versione attiva
              </Typography>
              <Typography sx={{ fontWeight: 950, mt: 0.2 }}>
                {active?.version || "-"}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 900 }}>
                Versioni
              </Typography>
              <Typography sx={{ fontWeight: 950, mt: 0.2 }}>{versions.length}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 900 }}>
                Fasi
              </Typography>
              <Typography sx={{ fontWeight: 950, mt: 0.2 }}>
                {latestVersion?.steps_count || latestVersion?.steps?.length || "-"}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 900 }}>
                Ultima modifica
              </Typography>
              <Typography sx={{ fontWeight: 950, mt: 0.2 }}>
                {formatDate(updatedAt)}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ flexGrow: 1 }} />

          <Divider />

          <Stack direction="row" spacing={1.2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              sx={{ borderRadius: 2.4, fontWeight: 900, textTransform: "none" }}
              onClick={() =>
                navigate(`/procedures/${procedure.definition_code}`)
              }
            >
              Apri
            </Button>
            <Button
              variant="contained"
              sx={{ borderRadius: 2.4, fontWeight: 900, textTransform: "none" }}
              onClick={() =>
                navigate(`/procedures/${procedure.definition_code}/versions`)
              }
            >
              Versioni
            </Button>          
          </Stack>
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
          Caricamento procedure automatiche...
        </Typography>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
      <CardContent sx={{ p: 5, textAlign: "center" }}>
        <ArticleOutlinedIcon sx={{ fontSize: 48, color: "#94a3b8" }} />
        <Typography sx={{ mt: 1.5, fontSize: 20, fontWeight: 950 }}>
          Nessuna procedura trovata
        </Typography>
        <Typography sx={{ mt: 0.5, color: "#64748b" }}>
          Modifica la ricerca oppure crea una nuova procedura automatica.
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProcedureConsole() {
  const [procedures, setProcedures] = useState([]);
  const [versionsByCode, setVersionsByCode] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadProcedures() {
    setLoading(true);

    try {
      const data = await listProcedures();
      const items = data.items || [];

      setProcedures(items);

      const versions = {};

      await Promise.all(
        items.map(async (procedure) => {
          const versionData = await listVersions(procedure.definition_code);
          versions[procedure.definition_code] = versionData.items || [];
        }),
      );

      setVersionsByCode(versions);
      setError(null);
    } catch (err) {
      setError(err.message || "Errore caricamento procedure");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProcedures();
  }, []);

  const filteredProcedures = useMemo(() => {
    const value = search.toLowerCase().trim();

    return procedures.filter((procedure) => {
      const active = getActiveVersion(procedure, versionsByCode);
      const draft = getDraftVersion(procedure, versionsByCode);
      const deprecated = getDeprecatedVersions(procedure, versionsByCode);

      if (filter === "PUBLISHED" && !active) return false;
      if (filter === "DRAFT" && !draft) return false;
      if (filter === "DEPRECATED" && deprecated.length === 0) return false;

      if (!value) return true;

      const name = operatorName(
        procedure.definition_code,
        procedure.name,
      ).toLowerCase();

      const description = operatorDescription(procedure).toLowerCase();

      return (
        name.includes(value)
        || description.includes(value)
        || procedure.definition_code.toLowerCase().includes(value)
      );
    });
  }, [procedures, versionsByCode, search, filter]);

  return (
    <AppLayout>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1700,
          mx: "auto",
          px: { xs: 0, md: 1 },
        }}
      >
        <Stack spacing={2.5}>
          <ProcedureHeader />

          <ProcedureStats procedures={procedures} versionsByCode={versionsByCode} />

          <ProcedureToolbar
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
          />

          {loading && <LoadingState />}

          {!loading && error && (
            <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 800 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && filteredProcedures.length === 0 && <EmptyState />}

          {!loading && !error && filteredProcedures.length > 0 && (
            <Grid container spacing={2.5} alignItems="stretch">
              {filteredProcedures.map((procedure) => (
                <Grid key={procedure.definition_code} item xs={12} xl={6}>
                  <ProcedureCard
                    procedure={procedure}
                    versionsByCode={versionsByCode}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Box>
    </AppLayout>
  );
}
