import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

function statusColor(status) {
  if (status === "COMPLETED") return "success";
  if (status === "RUNNING") return "primary";
  if (status === "FAILED" || status === "CANCELLED") return "error";
  if (status === "PAUSED") return "warning";
  return "default";
}

export default function BusinessOperationsTable({
  operations = [],
  loading = false,
  error = null,
  onSelect,
}) {
  if (loading) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Workflow Operations
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Workflow eseguiti dal motore Proximity
        </Typography>
      </Box>

      <Table size="small">
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell>Workflow / Customer</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Current Step</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Started</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {operations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    Nessun workflow disponibile.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            operations.map((workflow) => (
              <TableRow
                key={workflow.workflow_code}
                hover
                onClick={() => onSelect?.(workflow)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 900 }}>
                    {workflow.workflow_code}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {workflow.customer?.name || "Unknown Customer"}
                  </Typography>
                </TableCell>

                <TableCell>{workflow.workflow_type}</TableCell>

                <TableCell>
                  {workflow.service?.service_code || workflow.service_code}
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={workflow.status}
                    color={statusColor(workflow.status)}
                    variant="outlined"
                  />
                </TableCell>

                <TableCell>
                  {workflow.technical_step || workflow.current_step || "-"}
                </TableCell>

                <TableCell sx={{ minWidth: 160 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={workflow.progress || 0}
                      sx={{ flex: 1, height: 8, borderRadius: 10 }}
                    />
                    <Typography variant="caption" sx={{ width: 36 }}>
                      {workflow.progress || 0}%
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>{workflow.started_at || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
