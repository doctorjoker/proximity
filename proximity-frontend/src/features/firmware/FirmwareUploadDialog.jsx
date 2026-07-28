import React from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Stack, Switch, TextField } from "@mui/material";

export default function FirmwareUploadDialog({ open, form, file, loading, onClose, onFormChange, onFileChange, onSubmit }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Carica firmware</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>Il backend genera URL pubblico e record del catalogo.</Alert>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField fullWidth label="Vendor" value={form.vendor} onChange={(e) => onFormChange({ ...form, vendor: e.target.value })} />
            <TextField fullWidth label="Modello" value={form.model} onChange={(e) => onFormChange({ ...form, model: e.target.value })} />
          </Stack>
          <TextField fullWidth label="Versione" value={form.version} onChange={(e) => onFormChange({ ...form, version: e.target.value })} />
          <Button variant="outlined" component="label" sx={{ borderRadius: 999, fontWeight: 900, alignSelf: "flex-start" }}>Scegli file<input hidden type="file" accept=".bin,.img,.trx,.chk,.zip,.tar,.gz,.fw" onChange={(e) => onFileChange(e.target.files?.[0] || null)} /></Button>
          <TextField fullWidth label="File selezionato" value={file?.name || ""} InputProps={{ readOnly: true }} />
          <TextField fullWidth multiline rows={3} label="Note" value={form.notes} onChange={(e) => onFormChange({ ...form, notes: e.target.value })} />
          <Stack direction="row" spacing={2}>
            <FormControlLabel control={<Switch checked={form.stable} onChange={(e) => onFormChange({ ...form, stable: e.target.checked })} />} label="Stable" />
            <FormControlLabel control={<Switch checked={form.mandatory} onChange={(e) => onFormChange({ ...form, mandatory: e.target.checked })} />} label="Mandatory" />
          </Stack>
          {loading && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}><Button onClick={onClose} sx={{ borderRadius: 999, fontWeight: 900 }}>Annulla</Button><Button variant="contained" onClick={onSubmit} disabled={loading} sx={{ borderRadius: 999, fontWeight: 900 }}>Salva firmware</Button></DialogActions>
    </Dialog>
  );
}
