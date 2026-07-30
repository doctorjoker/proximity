import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RouterIcon from "@mui/icons-material/Router";

const safe = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const normalized = (value) => safe(value, "").toLowerCase();

export default function DeviceFleetTable({ devices = [], onOpenDevice }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return devices;

    return devices.filter((device) => [
      device.device_code,
      device.serial_number,
      device.manufacturer,
      device.model,
      device.product_class,
      device.software_version,
      device.customer_code,
      device.customer_name,
      device.service_code,
      device.acs_device_id,
    ].some((value) => normalized(value).includes(needle)));
  }, [devices, query]);

  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleQuery = (event) => {
    setQuery(event.target.value);
    setPage(0);
  };

  return (
    <Paper elevation={0} sx={{ border: "1px solid rgba(15,23,42,.10)", borderRadius: 4, overflow: "hidden" }}>
      <Box sx={{ p: 2.5, display: "flex", gap: 2, alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", flexDirection: { xs: "column", md: "row" } }}>
        <Box>
          <Typography variant="h6" fontWeight={950}>Device Fleet</Typography>
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            {filtered.length} dispositivi ACS. Include apparati assegnati, non assegnati e di laboratorio.
          </Typography>
        </Box>
        <TextField
          size="small"
          value={query}
          onChange={handleQuery}
          placeholder="Cerca seriale, vendor, modello, cliente, servizio..."
          sx={{ minWidth: { md: 390 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: "#f8fafc" }}>
              <TableCell>Dispositivo</TableCell>
              <TableCell>Vendor / Modello</TableCell>
              <TableCell>Firmware</TableCell>
              <TableCell>Assegnazione</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((device) => {
              const assigned = Boolean(device.customer_name || device.customer_code || device.service_code);
              return (
                <TableRow key={device.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>
                      <RouterIcon sx={{ color: "#2563eb" }} />
                      <Box>
                        <Typography fontWeight={900}>{safe(device.serial_number, device.device_code)}</Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>{safe(device.device_code)}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={800}>{safe(device.manufacturer)}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>{safe(device.model)}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{safe(device.software_version)}</Typography>
                  </TableCell>
                  <TableCell>
                    {assigned ? (
                      <Box>
                        <Typography fontWeight={800}>{safe(device.customer_name, device.customer_code)}</Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>{safe(device.service_code)}</Typography>
                      </Box>
                    ) : (
                      <Chip size="small" label="Non assegnato" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={device.online ? "Online" : safe(device.status, "Offline")} color={device.online ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onOpenDevice?.(device)}
                      sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2.5 }}
                    >
                      Apri Device360
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography fontWeight={900}>Nessun dispositivo trovato</Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", mt: .5 }}>Modifica il criterio di ricerca.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Righe per pagina"
      />
    </Paper>
  );
}
