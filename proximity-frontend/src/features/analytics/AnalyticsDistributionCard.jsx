import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export default function AnalyticsDistributionCard({ title, subtitle, items, total, onSelect }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid rgba(15,23,42,.08)", height: "100%" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={950}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>
      <Stack spacing={1.6}>
        {items.slice(0, 6).map((item) => <Box key={item.label} onClick={() => onSelect?.(item)} sx={{ cursor: onSelect ? "pointer" : "default" }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="body2" fontWeight={850} noWrap>{item.label}</Typography>
            <Typography variant="body2" fontWeight={950}>{item.value}{total ? ` · ${Math.round((item.value / total) * 100)}%` : ""}</Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: 99, background: "rgba(148,163,184,.18)", mt: .7, overflow: "hidden" }}>
            <Box sx={{ width: `${Math.max(5, (item.value / max) * 100)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#2563eb,#06b6d4)" }} />
          </Box>
        </Box>)}
        {!items.length && <Typography color="text.secondary">Nessun dato disponibile.</Typography>}
      </Stack>
    </CardContent>
  </Card>;
}
