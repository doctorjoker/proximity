import PropTypes from "prop-types";
import { Box } from "@mui/material";
import MetricCard from "../ui/MetricCard";

export default function WorkspaceMetrics({ metrics = [], columns = { xs: 1, sm: 2, lg: 4 } }) {
  if (!metrics.length) return null;

  return (
    <Box
      aria-label="Metriche workspace"
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${columns.xs || 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm || 2}, minmax(0, 1fr))`,
          lg: `repeat(${columns.lg || Math.min(metrics.length, 4)}, minmax(0, 1fr))`,
        },
        gap: 1.5,
      }}
    >
      {metrics.map((metric) => <MetricCard key={metric.key || metric.label} {...metric} />)}
    </Box>
  );
}

WorkspaceMetrics.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.shape({ xs: PropTypes.number, sm: PropTypes.number, lg: PropTypes.number }),
};
