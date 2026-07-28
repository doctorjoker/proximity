import React from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { SectionTitle, SoftCard } from "./FirmwareUi";
import { formatFileSize, safeText } from "./firmwareUtils";

export default function FirmwareRepository({ firmwareCatalog, pageLoading, onUpload, onDeploy, onDelete }) {
  return (
    <SoftCard>
      <CardContent sx={{ p: 3 }}>
        <SectionTitle
          title="Firmware Repository"
          subtitle="Catalogo firmware, versioni supportate e pacchetti disponibili per il rollout."
          action={<Button variant="outlined" onClick={onUpload} sx={{ borderRadius: 999, fontWeight: 900 }}>Carica firmware</Button>}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)", xl: "repeat(3,1fr)" }, gap: 2 }}>
          {firmwareCatalog.map((fw) => (
            <Card key={fw.id} elevation={0} sx={{ borderRadius: 4, border: "1px solid rgba(15,23,42,0.08)", background: "linear-gradient(180deg,#fff 0%,#f8fafc 100%)" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={950}>{safeText(fw.vendor)} {safeText(fw.model)}</Typography>
                    <Typography variant="h4" fontWeight={950} sx={{ mt: 1, color: "#1d4ed8" }}>{safeText(fw.version)}</Typography>
                  </Box>
                  <Stack spacing={0.75} alignItems="flex-end">
                    <Chip label={fw.stable ? "Stable" : "Lab"} color={fw.stable ? "success" : "default"} sx={{ fontWeight: 900 }} />
                    {fw.mandatory && <Chip size="small" label="Mandatory" color="warning" sx={{ fontWeight: 900 }} />}
                  </Stack>
                </Stack>
                <Box sx={{ mt: 2, p: 1.5, borderRadius: 3, background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <Typography variant="body2" fontWeight={850} noWrap>File: {safeText(fw.filename)}</Typography>
                  <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>Size: {formatFileSize(fw.file_size)}</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap>URL: {safeText(fw.url)}</Typography>
                </Box>
                {fw.notes && <Typography variant="body2" sx={{ color: "#64748b", mt: 1.5 }}>{fw.notes}</Typography>}
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                  <Button variant="contained" onClick={() => onDeploy(fw)} sx={{ borderRadius: 999, fontWeight: 900 }}>Deploy</Button>
                  <Button variant="outlined" color="error" onClick={() => onDelete(fw)} sx={{ borderRadius: 999, fontWeight: 900 }}>Elimina</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!firmwareCatalog.length && !pageLoading && (
            <Alert severity="info" sx={{ gridColumn: "1/-1", borderRadius: 3 }}>Nessun firmware presente nel repository.</Alert>
          )}
        </Box>
      </CardContent>
    </SoftCard>
  );
}
