import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function PhaseToolbar({
  view,
  onViewChange,
  onCreatePhase,
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
    >
      <Box>
        <Typography variant="h6" fontWeight={900}>
          Fasi procedura
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sequenza operativa eseguita dal motore interno.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button
          variant={view === "list" ? "contained" : "outlined"}
          size="small"
          onClick={() => onViewChange("list")}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          Elenco
        </Button>

        <Button
          variant={view === "diagram" ? "contained" : "outlined"}
          size="small"
          onClick={() => onViewChange("diagram")}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          Diagramma
        </Button>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => { alert("CLICK NUOVA FASE"); onCreatePhase?.(); }}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          Nuova fase
        </Button>
      </Stack>
    </Stack>
  );
}
