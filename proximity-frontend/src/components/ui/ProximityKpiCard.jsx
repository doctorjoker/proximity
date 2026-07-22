import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const TONES = {
  primary: { main: "#2563eb", soft: "rgba(37,99,235,0.10)" },
  success: { main: "#16a34a", soft: "rgba(22,163,74,0.10)" },
  warning: { main: "#d97706", soft: "rgba(217,119,6,0.11)" },
  error: { main: "#dc2626", soft: "rgba(220,38,38,0.10)" },
  cyan: { main: "#0891b2", soft: "rgba(8,145,178,0.10)" },
};

/**
 * Golden Reference KPI card copied from the Proximity Dashboard.
 * Proportions, icon rail, typography and semantic tones are intentionally
 * centralised here so feature pages cannot drift into a different product UI.
 */
export default function ProximityKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
  actionLabel = "Apri",
  onClick,
}) {
  const palette = TONES[tone] || TONES.primary;

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 138,
        borderRadius: 3,
        borderColor: "divider",
        overflow: "hidden",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
              borderColor: palette.main,
            }
          : undefined,
      }}
    >
      <ButtonBase
        onClick={onClick}
        disabled={!onClick}
        sx={{
          width: "100%",
          minHeight: 138,
          p: 0,
          textAlign: "left",
          alignItems: "stretch",
          justifyContent: "flex-start",
        }}
      >
        <Box
          sx={{
            width: 76,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: palette.soft,
            color: palette.main,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          {Icon ? <Icon sx={{ fontSize: 34 }} /> : null}
        </Box>

        <Stack sx={{ flex: 1, minWidth: 0, px: 2.1, py: 1.8 }} justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={800}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={950} sx={{ mt: 0.3, lineHeight: 1.05 }}>
              {value ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.45 }}>
              {helper}
            </Typography>
          </Box>

          {onClick ? (
            <Stack direction="row" spacing={0.45} alignItems="center" justifyContent="flex-end" sx={{ color: palette.main }}>
              <Typography variant="caption" fontWeight={900}>
                {actionLabel}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 15 }} />
            </Stack>
          ) : null}
        </Stack>
      </ButtonBase>
    </Paper>
  );
}
