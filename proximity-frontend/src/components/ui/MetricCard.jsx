import { Box, Stack, Typography } from "@mui/material";
import SurfaceCard from "./SurfaceCard";

const tones = {
  blue: { bg: "#eff6ff", fg: "#2563eb", border: "#dbeafe" },
  green: { bg: "#ecfdf5", fg: "#16a34a", border: "#bbf7d0" },
  amber: { bg: "#fff7ed", fg: "#d97706", border: "#fed7aa" },
  red: { bg: "#fef2f2", fg: "#dc2626", border: "#fecaca" },
  slate: { bg: "#f8fafc", fg: "#475569", border: "#e2e8f0" },
};

export default function MetricCard({ icon, label, value, helper, tone = "blue", actionLabel, onClick }) {
  const palette = tones[tone] || tones.blue;
  return (
    <SurfaceCard
      onClick={onClick}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
        "&:hover": onClick
          ? { transform: "translateY(-1px)", boxShadow: "0 16px 34px rgba(15,23,42,.08)", borderColor: palette.border }
          : undefined,
      }}
    >
      <Stack direction="row" spacing={1.6} alignItems="stretch" sx={{ minHeight: 122, p: 1.8 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            mt: 0.15,
            display: "grid",
            placeItems: "center",
            bgcolor: palette.bg,
            color: palette.fg,
            border: `1px solid ${palette.border}`,
            borderRadius: 2.4,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.55 }}>
            {label}
          </Typography>
          <Typography sx={{ color: "#0f172a", fontSize: 33, fontWeight: 950, lineHeight: 1.05, mt: 0.35 }}>
            {value}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 12, mt: 0.55 }} noWrap>
            {helper}
          </Typography>
          {actionLabel ? (
            <Typography sx={{ color: "#2563eb", fontSize: 12, fontWeight: 900, mt: "auto", pt: 0.7, textAlign: "left" }}>
              {actionLabel} →
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </SurfaceCard>
  );
}
