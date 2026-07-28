import { Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, Stack, Typography } from "@mui/material";
import DiagnosticsHealthPanel from "./DiagnosticsHealthPanel";
import DiagnosticsTimeline from "./DiagnosticsTimeline";
import { formatDate, safeText } from "./diagnosticsUtils";

const Panel = ({ eyebrow, title, children }) => (
  <Box sx={{ p: 2.5, borderRadius: 4, background: "white", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 10px 30px rgba(15,23,42,0.04)" }}>
    {eyebrow && <Typography variant="overline" color="primary.main" fontWeight={950}>{eyebrow}</Typography>}
    {title && <Typography variant="h6" fontWeight={950} sx={{ mb: 2 }}>{title}</Typography>}
    {children}
  </Box>
);

export default function DiagnosticsDrawer({ open, device, loading, actionLoading, onClose, onRefresh, onReboot }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 680 }, background: "#f8fafc" } }}>
      {loading ? <Box sx={{ p: 5 }}><CircularProgress /></Box> : device && (
        <Box>
          <Box sx={{ p: 3.5, color: "white", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0891b2 100%)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box>
                <Typography variant="overline" fontWeight={900}>NOC DEVICE CONSOLE</Typography>
                <Typography variant="h5" fontWeight={950}>{safeText(device.manufacturer)} {safeText(device.model)}</Typography>
                <Typography sx={{ opacity: 0.8 }}>{safeText(device.customer_name, "Cliente non associato")}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.72, mt: 0.5 }}>{safeText(device.serial_number)} · {safeText(device.device_code)}</Typography>
              </Box>
              <Chip label={device.online ? "ONLINE" : "OFFLINE"} color={device.online ? "success" : "default"} sx={{ fontWeight: 950 }} />
            </Stack>
          </Box>
          <Stack spacing={2} sx={{ p: 3 }}>
            {!device.diagnostics && <Alert severity="warning">Questo dispositivo non ha restituito dati diagnostici.</Alert>}
            <Panel eyebrow="HEALTH" title="Stato operativo">
              <DiagnosticsHealthPanel diagnostics={device.diagnostics} />
            </Panel>
            <Panel eyebrow="CONTEXT" title="WAN e ACS">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={900}>STATO CPE</Typography>
                  <Typography fontWeight={900}>{device.online ? "ONLINE" : "OFFLINE"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={900}>ULTIMO INFORM</Typography>
                  <Typography fontWeight={900}>{formatDate(device.last_seen)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={900}>FIRMWARE</Typography>
                  <Typography fontWeight={900}>{safeText(device.software_version)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={900}>SERVIZIO</Typography>
                  <Typography fontWeight={900}>{safeText(device.service_code)}</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={900}>ACS DEVICE ID</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, wordBreak: "break-all" }}>{safeText(device.acs_device_id)}</Typography>
            </Panel>
            <Panel eyebrow="ACTIVITY" title="Timeline operativa">
              <DiagnosticsTimeline device={device} />
            </Panel>
            <Panel eyebrow="QUICK ACTIONS" title="Comandi dispositivo">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" disabled={actionLoading} onClick={() => onRefresh(device)}>Refresh ACS</Button>
                <Button variant="outlined" color="warning" disabled={actionLoading} onClick={() => onReboot(device)}>Reboot</Button>
                <Button variant="text" onClick={onClose}>Chiudi</Button>
              </Stack>
            </Panel>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
