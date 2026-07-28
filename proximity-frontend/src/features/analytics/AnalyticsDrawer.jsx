import { Box, Button, Chip, CircularProgress, Divider, Drawer, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { safeNumber, safeText } from "./analyticsUtils";

export default function AnalyticsDrawer({ open, title, subtitle, rows, loading, onClose }) {
  const navigate = useNavigate();
  return <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 620 }, background: "#f8fafc" } }}>
    <Box sx={{ p: 3, color: "white", background: "linear-gradient(135deg,#0f172a,#1d4ed8 55%,#0891b2)" }}>
      <Typography variant="overline" fontWeight={900} sx={{ opacity: .8 }}>ANALYTICS DRILL-DOWN</Typography>
      <Typography variant="h4" fontWeight={950}>{title}</Typography>
      <Typography sx={{ opacity: .8, mt: .5 }}>{subtitle}</Typography>
      <Chip label={`${rows.length} elementi`} sx={{ mt: 2, color: "white", background: "rgba(255,255,255,.16)", fontWeight: 900 }} />
    </Box>
    <Box sx={{ p: 3 }}>
      {loading && <CircularProgress />}
      <Stack divider={<Divider flexItem />}>
        {rows.map((device) => <Stack key={device.id} direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1.5 }}>
          <Box sx={{ minWidth: 0 }}><Typography fontWeight={950} noWrap>{safeText(device.customer_name, safeText(device.device_code))}</Typography><Typography variant="body2" color="text.secondary" noWrap>{safeText(device.manufacturer)} {safeText(device.model)} · {safeText(device.serial_number)}</Typography><Stack direction="row" spacing={1} sx={{ mt: .8 }}><Chip size="small" label={device.online ? "ONLINE" : "OFFLINE"} color={device.online ? "success" : "error"} /><Chip size="small" label={`Health ${safeNumber(device.diagnostics?.health_score, "—")}`} /></Stack></Box>
          <Button size="small" variant="outlined" onClick={() => {
            const params = new URLSearchParams({
              device: String(device.id),
              q: safeText(device.device_code, safeText(device.serial_number, "")),
              open: "1",
            });
            navigate(`/diagnostics?${params.toString()}`);
          }} sx={{ borderRadius: 99, fontWeight: 900, alignSelf: "center" }}>Diagnostics</Button>
        </Stack>)}
        {!loading && !rows.length && <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Nessun elemento per questa selezione.</Typography>}
      </Stack>
    </Box>
  </Drawer>;
}
