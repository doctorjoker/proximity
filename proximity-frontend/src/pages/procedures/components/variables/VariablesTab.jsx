import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VariableTable from "./VariableTable";

export default function VariablesTab({
  items,
  onCreateVariable,
  onEditVariable,
  onDeleteVariable,
}) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6" fontWeight={900}>Variabili procedura</Typography>
          <Typography variant="body2" color="text.secondary">
            Input, output, costanti e secret caricati dal backend Procedure Runtime.
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onCreateVariable}
          sx={{ textTransform: "none", fontWeight: 850, borderRadius: 2 }}
        >
          Nuova variabile
        </Button>
      </Stack>

      <VariableTable
        items={items}
        onEditVariable={onEditVariable}
        onDeleteVariable={onDeleteVariable}
      />
    </Stack>
  );
}
