import React from "react";
import { Alert, Button, Card, CardActions, CardContent, Grid, Stack, Typography } from "@mui/material";

const PROCEDURES = [
  ["Riavvia router", "Riavvio controllato del CPE tramite ACS."],
  ["Reset WiFi", "Ripristino della configurazione wireless prevista."],
  ["Provisioning PPP", "Verifica e riallineamento dei parametri PPPoE."],
  ["Diagnostica completa", "Esecuzione coordinata dei test di connettività."],
  ["Firmware upgrade", "Aggiornamento firmware mediante procedura automatica."],
  ["Recovery dispositivo", "Procedura guidata per apparati degradati o non allineati."],
];

export default function ProceduresTab({ selected = {} }) {
  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h6">Procedure automatiche</Typography>
        <Typography variant="body2" color="text.secondary">
          Catalogo operativo contestuale al dispositivo selezionato.
        </Typography>
      </div>
      <Alert severity="info">
        Foundation pronta per il collegamento al Workflow Engine e ai modelli procedura compatibili con vendor e modello.
      </Alert>
      <Grid container spacing={2}>
        {PROCEDURES.map(([title, description]) => (
          <Grid item xs={12} md={6} key={title}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" disabled>Avvia procedura</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" color="text.secondary">
        Device: {selected.acs_device_id || selected._id || selected.serial_number || "N/D"}
      </Typography>
    </Stack>
  );
}
