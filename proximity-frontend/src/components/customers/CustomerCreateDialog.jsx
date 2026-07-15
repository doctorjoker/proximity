import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { Info } from "@mui/icons-material";

export default function CustomerCreateDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Nuovo cliente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Box sx={{ p: 1.6, borderRadius: 2.5, bgcolor: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <Stack direction="row" spacing={1.1} alignItems="flex-start">
              <Info sx={{ color: "#2563eb", mt: 0.1 }} />
              <Box>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Punto di ingresso già predisposto</Typography>
                <Typography sx={{ color: "#475569", fontSize: 13.5, mt: 0.35 }}>
                  Il flusso di creazione cliente non è ancora collegato al backend. Il pulsante resta operativo per rendere visibile la funzione pianificata.
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 0.8 }}>Campi previsti</Typography>
            <Typography sx={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.8 }}>
              • Anagrafica e contatti<br />
              • Contratto e profilo servizio<br />
              • Credenziali PPPoE<br />
              • Indirizzo di installazione<br />
              • Associazione CPE iniziale
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 900 }}>Chiudi</Button>
        <Button disabled variant="contained" sx={{ textTransform: "none", fontWeight: 900 }}>Salva cliente</Button>
      </DialogActions>
    </Dialog>
  );
}
