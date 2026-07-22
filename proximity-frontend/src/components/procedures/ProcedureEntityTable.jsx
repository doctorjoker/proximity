import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import ProcedureActionMenu from "./ProcedureActionMenu";
import {
  formatDate,
  getActiveVersion,
  getDraftVersion,
  getVersions,
  operatorDescription,
  operatorName,
  procedureCode,
} from "./catalogUtils";

function StatusBadge({ active, draft }) {
  if (active) {
    return <Chip icon={<CheckCircleIcon />} label="Attiva" color="success" variant="outlined" size="small" sx={{ fontWeight: 900 }} />;
  }

  if (draft) {
    return <Chip icon={<EditNoteIcon />} label="Bozza" color="warning" variant="outlined" size="small" sx={{ fontWeight: 900 }} />;
  }

  return <Chip label="Storica" color="default" variant="outlined" size="small" sx={{ fontWeight: 900 }} />;
}

export default function ProcedureEntityTable({ procedures, versionsByCode, selectedCode, onSelect, onOpen, onVersions }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff", overflow: "hidden" }}>
      <TableContainer>
        <Table sx={{ minWidth: 1040 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 950, color: "#475569", py: 1.6 }}>Procedura</TableCell>
              <TableCell sx={{ fontWeight: 950, color: "#475569" }}>Stato</TableCell>
              <TableCell sx={{ fontWeight: 950, color: "#475569" }}>Versione attiva</TableCell>
              <TableCell sx={{ fontWeight: 950, color: "#475569" }}>Versioni</TableCell>
              <TableCell sx={{ fontWeight: 950, color: "#475569" }}>Fasi</TableCell>
              <TableCell sx={{ fontWeight: 950, color: "#475569" }}>Ultima modifica</TableCell>
              <TableCell align="right" sx={{ fontWeight: 950, color: "#475569" }}>Azioni</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {procedures.map((procedure) => {
              const code = procedureCode(procedure);
              const versions = getVersions(procedure, versionsByCode);
              const active = getActiveVersion(procedure, versionsByCode);
              const draft = getDraftVersion(procedure, versionsByCode);
              const latestVersion = versions[0];
              const updatedAt = latestVersion?.updated_at || latestVersion?.created_at || procedure.updated_at;
              const versionToOpen = procedure.draft_version || procedure.active_version || active?.version || draft?.version || "v1.0";
              const selected = selectedCode === code;

              return (
                <TableRow
                  key={code}
                  hover
                  selected={selected}
                  onClick={() => onSelect?.(procedure)}
                  onDoubleClick={() => onOpen(procedure, versionToOpen)}
                  sx={{
                    cursor: "pointer",
                    "&:last-child td": { borderBottom: 0 },
                    "&:hover": { bgcolor: "#fbfdff" },
                    "&.Mui-selected": { bgcolor: "#eff6ff" },
                    "&.Mui-selected:hover": { bgcolor: "#e8f1ff" },
                  }}
                >
                  <TableCell sx={{ py: 1.7 }}>
                    <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 300 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ArticleOutlinedIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 950, color: "#0f172a", lineHeight: 1.25 }}>{operatorName(code, procedure.name)}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap title={operatorDescription(procedure)} sx={{ mt: 0.35, maxWidth: 430 }}>
                          {operatorDescription(procedure)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800 }}>{code}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.7} alignItems="flex-start">
                      <StatusBadge active={active} draft={draft} />
                      {active && draft && <Chip label={`Bozza ${draft.version}`} color="warning" variant="outlined" size="small" sx={{ fontWeight: 900 }} />}
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 900 }}>{active?.version || "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>{versions.length}</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>{latestVersion?.phase_count ?? latestVersion?.steps_count ?? latestVersion?.steps?.length ?? "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#475569" }}>{formatDate(updatedAt)}</TableCell>

                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Button size="small" variant="text" startIcon={<VisibilityOutlinedIcon />} onClick={() => onSelect?.(procedure)} sx={{ textTransform: "none", fontWeight: 900 }}>
                        Consulta
                      </Button>
                      <ProcedureActionMenu onPreview={() => onSelect?.(procedure)} onOpen={() => onOpen(procedure, versionToOpen)} onVersions={() => onVersions(procedure)} />
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
