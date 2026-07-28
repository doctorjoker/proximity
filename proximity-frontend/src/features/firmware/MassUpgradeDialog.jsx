import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, LinearProgress, MenuItem, Select, Stack, Typography } from "@mui/material";

export default function MassUpgradeDialog({ open, firmwareCatalog, firmwareId, selectedCount, loading, result, onClose, onFirmwareChange, onRun }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Nuova campagna firmware</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>Verranno creati task GenieACS download per i dispositivi selezionati.</Alert>
        <Stack spacing={2}>
          <FormControl fullWidth><InputLabel>Firmware</InputLabel><Select label="Firmware" value={firmwareId} onChange={(e) => onFirmwareChange(e.target.value)}>{firmwareCatalog.map((fw) => <MenuItem key={fw.id} value={fw.id}>{fw.vendor} {fw.model} - {fw.version} - {fw.filename}</MenuItem>)}</Select></FormControl>
          <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc" }}><Typography fontWeight={900}>Device selezionati: {selectedCount}</Typography><Typography variant="body2" sx={{ color: "#64748b" }}>Usa la tab Targets per modificare la selezione.</Typography></Box>
          {loading && <LinearProgress />}
          {result && <Alert severity={result.failed > 0 ? "warning" : "success"} sx={{ borderRadius: 3 }}>Upgrade creato: {result.created} task creati, {result.failed} falliti.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}><Button onClick={onClose} sx={{ borderRadius: 999, fontWeight: 900 }}>Chiudi</Button><Button variant="contained" onClick={onRun} disabled={loading} sx={{ borderRadius: 999, fontWeight: 900 }}>Avvia upgrade</Button></DialogActions>
    </Dialog>
  );
}
