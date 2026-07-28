import React from "react";
import { Button, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { SectionTitle, SoftCard } from "./FirmwareUi";
import { safeText } from "./firmwareUtils";

export default function FirmwareTargets({ devices, selectedDeviceIds, onToggleDevice, onContinue }) {
  return (
    <SoftCard><CardContent sx={{ p: 3 }}>
      <SectionTitle title="Campaign targets" subtitle="Seleziona i dispositivi che riceveranno il firmware nella prossima campagna."
        action={<Button variant="contained" disabled={!selectedDeviceIds.length} onClick={onContinue} sx={{ borderRadius: 999, fontWeight: 900 }}>Continua ({selectedDeviceIds.length})</Button>} />
      <TableContainer><Table size="small">
        <TableHead><TableRow><TableCell padding="checkbox" /><TableCell sx={{ fontWeight: 950 }}>Device</TableCell><TableCell sx={{ fontWeight: 950 }}>Vendor / Modello</TableCell><TableCell sx={{ fontWeight: 950 }}>Firmware attuale</TableCell><TableCell sx={{ fontWeight: 950 }}>Stato</TableCell></TableRow></TableHead>
        <TableBody>{devices.map((device) => (
          <TableRow key={device.id} hover selected={selectedDeviceIds.includes(device.id)}>
            <TableCell padding="checkbox"><input type="checkbox" checked={selectedDeviceIds.includes(device.id)} onChange={() => onToggleDevice(device.id)} /></TableCell>
            <TableCell><Typography fontWeight={900}>{safeText(device.device_code, safeText(device.serial_number))}</Typography><Typography variant="caption" sx={{ color: "#64748b" }}>{safeText(device.acs_device_id)}</Typography></TableCell>
            <TableCell>{safeText(device.manufacturer)} {safeText(device.model)}</TableCell><TableCell>{safeText(device.software_version)}</TableCell>
            <TableCell><Chip size="small" label={device.online ? "ONLINE" : "OFFLINE"} color={device.online ? "success" : "default"} /></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></TableContainer>
    </CardContent></SoftCard>
  );
}
