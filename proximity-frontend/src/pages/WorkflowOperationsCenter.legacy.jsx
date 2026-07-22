import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import {
  PendingActions,
  PlayCircle,
  CheckCircle,
  Error,
} from "@mui/icons-material";

import AppLayout from "../components/layout/AppLayout";
import KpiCard from "../components/cards/KpiCard";

const API = "/api/v1/service-workflows/business-dashboard?limit=50";

const statusColor = {
  FAILED: "error",
  COMPLETED: "success",
  RUNNING: "info",
  PENDING: "warning",
  CREATED: "default",
};

function fmt(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("it-IT");
}

export default function WorkflowOperationsCenter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operations, setOperations] = useState([]);

  async function loadDashboard() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("Errore caricamento dashboard");
      const data = await res.json();
      setOperations(data.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 5000);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => ({ pending: operations.filter(o=>o.status==="PENDING").length, running: operations.filter(o=>o.status==="RUNNING").length, completed: operations.filter(o=>o.status==="COMPLETED").length, failed: operations.filter(o=>o.status==="FAILED").length}), [operations]);

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ p: 6, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert severity="error">{error}</Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Operations Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoraggio operativo di queue, worker, retry e workflow recenti
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Pending"
              value={summary.pending ?? 0}
              color="#f59e0b"
              icon={<PendingActions sx={{ fontSize: 40, color: "#f59e0b" }} />}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <KpiCard
              title="Running"
              value={summary.running ?? 0}
              color="#2563eb"
              icon={<PlayCircle sx={{ fontSize: 40, color: "#2563eb" }} />}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <KpiCard
              title="Completed"
              value={summary.completed ?? 0}
              color="#16a34a"
              icon={<CheckCircle sx={{ fontSize: 40, color: "#16a34a" }} />}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <KpiCard
              title="Attention"
              value={summary.failed ?? 0}
              color="#dc2626"
              icon={<Error sx={{ fontSize: 40, color: "#dc2626" }} />}
            />
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3, borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Workflow Queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ultimi job accodati, tentativi, worker e ultimo errore
            </Typography>
          </Box>

          <Table size="small">
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell>Workflow</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Retry</TableCell>
                <TableCell>Worker</TableCell>
                <TableCell>Error</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Completed</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {operations.map((row) => (
                <TableRow hover key={row.workflow_code}>
                  <TableCell sx={{ fontWeight: 700 }}>{row.workflow_code}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={statusColor[row.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>{row.retry_count}/3</TableCell>
                  <TableCell>{row.worker_id || "-"}</TableCell>
                  <TableCell>{row.last_error || "-"}</TableCell>
                  <TableCell>{fmt(row.scheduled_at)}</TableCell>
                  <TableCell>{fmt(row.completed_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Recent Workflows
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ultime esecuzioni registrate dal Workflow Engine
            </Typography>
          </Box>

          <Table size="small">
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell>Workflow</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Step</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {operations.map((row) => (
                <TableRow hover key={row.workflow_code}>
                  <TableCell sx={{ fontWeight: 700 }}>{row.workflow_code}</TableCell>
                  <TableCell>{row.workflow_type}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={statusColor[row.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>{row.current_step}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={row.progress || 0}
                          color={row.status === "FAILED" ? "error" : "success"}
                        />
                      </Box>
                      <Typography variant="caption">{row.progress}%</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{fmt(row.started_at)}</TableCell>
                  <TableCell>{fmt(row.completed_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </AppLayout>
  );
}
