import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { safeNumber, safeText } from "./analyticsUtils";

const palette = {
  critical: { fg: "#b91c1c", bg: "#fff1f2", border: "rgba(239,68,68,.28)", bar: "#ef4444" },
  warning: { fg: "#b45309", bg: "#fffbeb", border: "rgba(245,158,11,.32)", bar: "#f59e0b" },
  healthy: { fg: "#047857", bg: "#ecfdf5", border: "rgba(16,185,129,.30)", bar: "#10b981" },
};

const getScore = (device) => safeNumber(device.diagnostics?.health_score, null);
const getCpu = (device) => safeNumber(device.diagnostics?.cpu_usage_percent, 0);
const getMemory = (device) => safeNumber(device.diagnostics?.memory_used_percent, 0);

const getSeverity = (device) => {
  if (!device.online) return "critical";
  const score = getScore(device);
  if (score !== null && score < 65) return "critical";
  if (getCpu(device) >= 85 || getMemory(device) >= 85) return "critical";
  if (score !== null && score < 85) return "warning";
  if (getCpu(device) >= 70 || getMemory(device) >= 70) return "warning";
  return "healthy";
};

const getReason = (device) => {
  if (!device.online) return "Device offline";
  const score = getScore(device);
  if (score !== null && score < 65) return `Health critico · ${score}/100`;
  if (getCpu(device) >= 85) return `CPU critica · ${getCpu(device)}%`;
  if (getMemory(device) >= 85) return `RAM critica · ${getMemory(device)}%`;
  if (score !== null && score < 85) return `Health in attenzione · ${score}/100`;
  if (getCpu(device) >= 70) return `CPU elevata · ${getCpu(device)}%`;
  if (getMemory(device) >= 70) return `RAM elevata · ${getMemory(device)}%`;
  return `Health regolare · ${score ?? "N/D"}/100`;
};

function PriorityColumn({ tone, eyebrow, title, count, description, items, onOpen }) {
  const colors = palette[tone];
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: `1px solid ${colors.border}`,
        background: `linear-gradient(180deg, ${colors.bg} 0%, #ffffff 38%)`,
        minHeight: 390,
        overflow: "hidden",
      }}
    >
      <Box sx={{ height: 6, background: colors.bar }} />
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ color: colors.fg, fontWeight: 950, letterSpacing: 1.2 }}>
              {eyebrow}
            </Typography>
            <Typography variant="h5" fontWeight={950}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{description}</Typography>
          </Box>
          <Box sx={{ minWidth: 54, height: 54, borderRadius: 3, display: "grid", placeItems: "center", background: colors.bg, border: `1px solid ${colors.border}` }}>
            <Typography variant="h5" fontWeight={950} sx={{ color: colors.fg }}>{count}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.2}>
          {items.slice(0, 4).map((device) => (
            <Box
              key={device.id}
              onClick={() => onOpen(device)}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid rgba(15,23,42,.07)",
                background: "rgba(255,255,255,.82)",
                cursor: "pointer",
                transition: "transform .15s ease, box-shadow .15s ease",
                "&:hover": { transform: "translateY(-1px)", boxShadow: "0 10px 26px rgba(15,23,42,.08)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={950} noWrap>{safeText(device.customer_name, safeText(device.device_code))}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {safeText(device.manufacturer)} {safeText(device.model)} · {safeText(device.serial_number)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: .7, color: colors.fg, fontWeight: 850 }}>
                    {getReason(device)}
                  </Typography>
                </Box>
                <Chip size="small" label={device.online ? "ONLINE" : "OFFLINE"} color={device.online ? "success" : "error"} sx={{ fontWeight: 900 }} />
              </Stack>
            </Box>
          ))}

          {!items.length && (
            <Alert severity={tone === "healthy" ? "success" : "info"} sx={{ borderRadius: 3 }}>
              {tone === "healthy" ? "Nessun device fuori soglia." : "Nessuna priorità in questa fascia."}
            </Alert>
          )}
        </Stack>

        {items.length > 4 && (
          <Button onClick={() => onOpen({ __group: tone })} sx={{ mt: 1.5, px: 0, fontWeight: 900, color: colors.fg }}>
            Mostra tutti ({items.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActionRow({ label, count, helper, progress, tone, onClick }) {
  const colors = palette[tone];
  return (
    <Box onClick={onClick} sx={{ py: 1.35, cursor: onClick ? "pointer" : "default" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography fontWeight={900}>{label}</Typography>
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
        </Box>
        <Chip label={count} size="small" sx={{ fontWeight: 950, color: colors.fg, background: colors.bg }} />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(4, Math.min(100, progress || 0))}
        sx={{ mt: 1, height: 7, borderRadius: 99, background: "#e2e8f0", "& .MuiLinearProgress-bar": { background: colors.bar, borderRadius: 99 } }}
      />
    </Box>
  );
}

export default function AnalyticsInsights({ devices, outdatedCount = 0, onOpen, onOpenGroup }) {
  const monitored = devices.filter((device) => device.diagnostics);
  const critical = devices.filter((device) => getSeverity(device) === "critical");
  const warning = devices.filter((device) => getSeverity(device) === "warning");
  const healthy = devices.filter((device) => getSeverity(device) === "healthy");

  const cpuHigh = monitored.filter((device) => getCpu(device) >= 70);
  const memoryHigh = monitored.filter((device) => getMemory(device) >= 70);
  const offline = devices.filter((device) => !device.online);
  const denominator = Math.max(devices.length, 1);

  const handleColumnOpen = (device) => {
    if (device?.__group) onOpenGroup?.(device.__group);
    else onOpen(device);
  };

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3,1fr)" }, gap: 2 }}>
        <PriorityColumn tone="critical" eyebrow="PRIORITÀ 1" title="Critical" count={critical.length} description="Intervento immediato richiesto" items={critical} onOpen={handleColumnOpen} />
        <PriorityColumn tone="warning" eyebrow="PRIORITÀ 2" title="Warning" count={warning.length} description="Condizioni da monitorare" items={warning} onOpen={handleColumnOpen} />
        <PriorityColumn tone="healthy" eyebrow="STABILE" title="Healthy" count={healthy.length} description="Device senza anomalie rilevanti" items={healthy} onOpen={handleColumnOpen} />
      </Box>

      <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid rgba(15,23,42,.08)" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h5" fontWeight={950}>Azioni consigliate</Typography>
              <Typography variant="body2" color="text.secondary">Coda operativa ordinata per impatto sulla fleet.</Typography>
            </Box>
            <Chip label={`${critical.length + warning.length} device da presidiare`} color={critical.length ? "error" : warning.length ? "warning" : "success"} sx={{ fontWeight: 900 }} />
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, columnGap: 4 }}>
            <Stack divider={<Divider flexItem />}>
              <ActionRow label="Ripristina device offline" count={offline.length} helper="Verifica connettività, ultimo Inform e stato ACS" progress={(offline.length / denominator) * 100} tone="critical" onClick={() => onOpenGroup?.("offline")} />
              <ActionRow label="Analizza health critico" count={critical.length} helper="Health basso o risorse oltre soglia" progress={(critical.length / denominator) * 100} tone="critical" onClick={() => onOpenGroup?.("critical")} />
            </Stack>
            <Stack divider={<Divider flexItem />}>
              <ActionRow label="Riduci pressione CPU / RAM" count={new Set([...cpuHigh, ...memoryHigh].map((item) => item.id)).size} helper="Carico risorse superiore al 70%" progress={(new Set([...cpuHigh, ...memoryHigh].map((item) => item.id)).size / denominator) * 100} tone="warning" onClick={() => onOpenGroup?.("resources")} />
              <ActionRow label="Allinea firmware" count={outdatedCount} helper="Device non conformi al catalogo stable" progress={(outdatedCount / denominator) * 100} tone="warning" onClick={() => onOpenGroup?.("firmware")} />
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
