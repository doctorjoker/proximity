import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { safeText } from "./firmwareUtils";

export default function FirmwareDeleteDialog({ target, loading, onClose, onConfirm }) {
  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Elimina firmware</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>Questa operazione elimina il record e tenta la rimozione del file dal repository.</Alert>
        {target && <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc" }}><Typography fontWeight={950}>{safeText(target.vendor)} {safeText(target.model)}</Typography><Typography variant="h5" fontWeight={950} color="primary">{safeText(target.version)}</Typography></Box>}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}><Button onClick={onClose} sx={{ borderRadius: 999, fontWeight: 900 }}>Annulla</Button><Button variant="contained" color="error" onClick={onConfirm} disabled={loading} sx={{ borderRadius: 999, fontWeight: 900 }}>Elimina</Button></DialogActions>
    </Dialog>
  );
}
