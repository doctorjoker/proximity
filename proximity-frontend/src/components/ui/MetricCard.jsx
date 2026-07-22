import PropTypes from "prop-types";
import { Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

export default function MetricCard({ label, value, icon: Icon, helper, trend, loading = false, onClick }) {
  const positive = Number(trend) >= 0;
  const TrendIcon = positive ? TrendingUpRoundedIcon : TrendingDownRoundedIcon;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "&:hover": onClick ? { transform: "translateY(-1px)", boxShadow: 4 } : undefined,
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={650}>{label}</Typography>
            {loading ? (
              <Skeleton width={90} height={40} />
            ) : (
              <Typography variant="h5" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
            )}
          </Box>
          {Icon && (
            <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: "action.hover", color: "primary.main" }}>
              <Icon fontSize="small" />
            </Box>
          )}
        </Stack>

        {(helper || trend !== undefined) && (
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1.2 }}>
            {trend !== undefined && (
              <Stack direction="row" spacing={0.2} alignItems="center" color={positive ? "success.main" : "error.main"}>
                <TrendIcon sx={{ fontSize: 17 }} />
                <Typography variant="caption" fontWeight={800}>{Math.abs(Number(trend))}%</Typography>
              </Stack>
            )}
            {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  helper: PropTypes.string,
  trend: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  loading: PropTypes.bool,
  onClick: PropTypes.func,
};
