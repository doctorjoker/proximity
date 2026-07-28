import React from "react";
import { Box, Button, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { SectionTitle, SoftCard } from "./FirmwareUi";
import { formatDate, safeText } from "./firmwareUtils";

export default function FirmwareCampaigns({ jobs, onNewCampaign }) {
  return (
    <SoftCard>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, pb: 1 }}>
          <SectionTitle
            title="Campaign Manager"
            subtitle="Job firmware, avanzamento e storico dei task inviati a GenieACS."
            action={<Button variant="contained" onClick={onNewCampaign} sx={{ borderRadius: 999, fontWeight: 900 }}>Nuova campagna</Button>}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontWeight: 950 }}>Job</TableCell><TableCell sx={{ fontWeight: 950 }}>Device</TableCell>
              <TableCell sx={{ fontWeight: 950 }}>Task GenieACS</TableCell><TableCell sx={{ fontWeight: 950 }}>Stato</TableCell>
              <TableCell sx={{ fontWeight: 950 }}>Creato da</TableCell><TableCell sx={{ fontWeight: 950 }}>Data</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell><Typography fontWeight={900}>{safeText(job.job_code)}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 280, wordBreak: "break-word" }}>{safeText(job.acs_device_id)}</TableCell>
                  <TableCell><Chip size="small" label={safeText(job.task_id)} sx={{ fontWeight: 800 }} /></TableCell>
                  <TableCell><Chip size="small" label={safeText(job.status)} color={job.status === "FAILED" ? "error" : "success"} sx={{ fontWeight: 900 }} /></TableCell>
                  <TableCell>{safeText(job.created_by)}</TableCell><TableCell>{formatDate(job.created_at)}</TableCell>
                </TableRow>
              ))}
              {!jobs.length && <TableRow><TableCell colSpan={6}><Box sx={{ p: 4, textAlign: "center" }}>Nessun job firmware presente.</Box></TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </SoftCard>
  );
}
