import { Button, Drawer, Stack, TextField, Typography } from "@mui/material";

export default function PhaseDrawer({
  open,
  phase,
  onClose,
  onSave,
  saving = false,
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack spacing={2} sx={{ width: 520, p: 3 }}>
        <Typography variant="h5" fontWeight={900}>
          {phase?.isNew ? "Nuova fase" : "Modifica fase"}
        </Typography>

        <TextField label="Nome fase" value={phase?.name || ""} fullWidth />
        <TextField label="Azione" value={phase?.action || ""} fullWidth />

        <Button variant="contained" disabled={saving} onClick={() => onSave(phase)}>
          Salva fase
        </Button>

        <Button variant="outlined" onClick={onClose}>
          Annulla
        </Button>
      </Stack>
    </Drawer>
  );
}
