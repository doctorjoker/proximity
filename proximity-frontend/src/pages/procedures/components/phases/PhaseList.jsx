import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export default function PhaseList({
  phases,
  onEditPhase,
}) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 4,
      }}
    >
      <Table size="medium">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Fase</TableCell>
            <TableCell>Azione</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell align="right">Timeout</TableCell>
            <TableCell align="right">Retry</TableCell>
            <TableCell>Stato</TableCell>
            <TableCell align="right">Azioni</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {phases.map((phase) => (
            <TableRow
              key={phase.id ?? phase.phase_order}
              hover
            >
              <TableCell>
                <Typography fontWeight={900}>
                  {phase.phase_order}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography fontWeight={800}>
                  {phase.name}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {phase.action}
                </Typography>
              </TableCell>

              <TableCell>
                <Chip
                  size="small"
                  label={phase.type}
                  variant="outlined"
                />
              </TableCell>

              <TableCell align="right">
                {phase.timeout}
              </TableCell>

              <TableCell align="right">
                {phase.retry}
              </TableCell>

              <TableCell>
                <Chip
                  size="small"
                  label={phase.status}
                  color={
                    phase.status === "DRAFT"
                      ? "warning"
                      : "success"
                  }
                  variant={
                    phase.status === "DRAFT"
                      ? "outlined"
                      : "filled"
                  }
                />
              </TableCell>

              <TableCell align="right">
                <Tooltip title="Modifica fase">
                  <IconButton
                    size="small"
                    onClick={() => onEditPhase(phase)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Altre azioni">
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
