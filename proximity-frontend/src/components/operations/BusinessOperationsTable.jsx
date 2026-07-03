import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import BusinessOperationRow from "./BusinessOperationRow";

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
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Business Operations
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Operazioni orientate a cliente, servizio e attività operativa
        </Typography>
      </Box>

      <Table size="small">
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Operation</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Current Step</TableCell>
            <TableCell>Worker</TableCell>
            <TableCell>Progress</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {operations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    Nessuna operazione disponibile.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            operations.map((operation) => (
              <BusinessOperationRow
                key={operation.operation_code}
                operation={operation}
                onClick={onSelect}
              />
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
