import React, { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { Groups } from "@mui/icons-material";
import EmptyState from "../ui/EmptyState";

const muted = "#64748b";
const safe = (value, fallback = "N/D") => value === null || value === undefined || value === "" ? fallback : String(value);

const columns = [
  { key: "customer_name", label: "Cliente" },
  { key: "contract_number", label: "Contratto / Profilo" },
  { key: "radius_login", label: "PPPoE" },
  { key: "router", label: "Router", sortable: false },
  { key: "city", label: "Località" },
  { key: "status", label: "Stato", sortable: false },
];

export default function CustomerTable({ customers, loading, onOpenCustomer }) {
  const [orderBy, setOrderBy] = useState("customer_name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const sorted = useMemo(() => {
    const result = [...customers];
    result.sort((a, b) => {
      const av = safe(a?.[orderBy], "").toLowerCase();
      const bv = safe(b?.[orderBy], "").toLowerCase();
      return (av < bv ? -1 : av > bv ? 1 : 0) * (order === "asc" ? 1 : -1);
    });
    return result;
  }, [customers, orderBy, order]);

  const visible = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (key) => {
    if (orderBy === key) setOrder((current) => current === "asc" ? "desc" : "asc");
    else {
      setOrderBy(key);
      setOrder("asc");
    }
    setPage(0);
  };

  return (
    <>
      <TableContainer sx={{ maxHeight: "calc(100vh - 470px)", minHeight: 260 }}>
        <Table size="small" stickyHeader>
          <TableHead sx={{ bgcolor: "#f8fafc", "& th": { fontWeight: 900, color: "#334155", borderBottom: "1px solid #dbe3ec", whiteSpace: "nowrap" } }}>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.sortable === false ? column.label : (
                    <TableSortLabel
                      active={orderBy === column.key}
                      direction={orderBy === column.key ? order : "asc"}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((customer) => {
              const devices = customer.devices || [];
              const firstDevice = devices[0];
              return (
                <TableRow hover key={customer.id} onDoubleClick={() => onOpenCustomer(customer)} sx={{ cursor: "pointer", "& td": { py: 1.55 }, "&:hover": { bgcolor: "#f8fbff" } }}>
                  <TableCell>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "#dbeafe", color: "#2563eb", fontWeight: 950 }}>
                        {safe(customer.customer_name, "?").slice(0, 1)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>{safe(customer.customer_name)}</Typography>
                        <Typography sx={{ color: muted, fontSize: 12 }} noWrap>{safe(customer.customer_code)}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{safe(customer.contract_number)}</Typography>
                    <Typography sx={{ color: muted, fontSize: 12 }}>{safe(customer.profile)}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{safe(customer.radius_login)}</TableCell>
                  <TableCell>
                    {firstDevice ? (
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{safe(firstDevice.manufacturer)} {safe(firstDevice.model)}</Typography>
                        <Typography sx={{ color: muted, fontSize: 11.5 }}>{devices.length} device</Typography>
                      </Box>
                    ) : <Typography sx={{ color: muted, fontSize: 12 }}>Non associato</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{[customer.city, customer.province].filter(Boolean).join(" · ") || "N/D"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={devices.length ? "LINKED" : "NO CPE"} color={devices.length ? "success" : "default"} sx={{ fontWeight: 900 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={() => onOpenCustomer(customer)} sx={{ textTransform: "none", fontWeight: 900 }}>
                      Customer 360
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && customers.length === 0 ? (
        <EmptyState icon={<Groups sx={{ fontSize: 46 }} />} title="Nessun cliente trovato" description="Modifica i criteri di ricerca oppure aggiorna l'elenco." />
      ) : null}

      <TablePagination
        component="div"
        count={customers.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 15, 25, 50]}
        labelRowsPerPage="Righe per pagina"
      />
    </>
  );
}
