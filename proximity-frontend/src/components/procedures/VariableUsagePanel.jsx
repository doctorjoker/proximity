import { Box, Chip, Stack, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

function UsageGroup({ label, items, emptyText }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.48 }}>{label}</Typography>
      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
        {items.length > 0 ? items.map((item) => <Chip key={item} label={item} size="small" variant="outlined" sx={{ fontWeight: 800, bgcolor: "#fff" }} />) : <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 700 }}>{emptyText}</Typography>}
      </Stack>
    </Box>
  );
}

export default function VariableUsagePanel({ variable, accent = "#7c3aed" }) {
  return (
    <Box sx={{ border: "1px solid #dbe5f0", borderRadius: 2.35, bgcolor: "#fff", overflow: "hidden" }}>
      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ px: 1.45, py: 1.1, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <AccountTreeOutlinedIcon sx={{ fontSize: 17, color: accent }} />
        <Typography sx={{ fontWeight: 950, color: "#0f172a", fontSize: 14 }}>Utilizzo nelle fasi</Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ p: 1.45 }}>
        <UsageGroup label="Letta da" items={variable.readBy || []} emptyText="Nessuna fase rilevata" />
        <UsageGroup label="Scritta da" items={variable.writtenBy || []} emptyText="Nessuna fase rilevata" />
      </Stack>
    </Box>
  );
}
