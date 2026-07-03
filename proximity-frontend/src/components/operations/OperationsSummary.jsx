import { Grid } from "@mui/material";

import KpiCard from "../cards/KpiCard";

import {
  PendingActions,
  PlayCircle,
  CheckCircle,
  Error,
} from "@mui/icons-material";

export default function OperationsSummary({ summary }) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <KpiCard
          title="Pending"
          value={summary.pending ?? 0}
          color="#f59e0b"
          icon={
            <PendingActions
              sx={{
                fontSize: 40,
                color: "#f59e0b",
              }}
            />
          }
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <KpiCard
          title="Running"
          value={summary.running ?? 0}
          color="#2563eb"
          icon={
            <PlayCircle
              sx={{
                fontSize: 40,
                color: "#2563eb",
              }}
            />
          }
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <KpiCard
          title="Completed"
          value={summary.completed ?? 0}
          color="#16a34a"
          icon={
            <CheckCircle
              sx={{
                fontSize: 40,
                color: "#16a34a",
              }}
            />
          }
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <KpiCard
          title="Attention"
          value={summary.failed ?? 0}
          color="#dc2626"
          icon={
            <Error
              sx={{
                fontSize: 40,
                color: "#dc2626",
              }}
            />
          }
        />
      </Grid>
    </Grid>
  );
}
