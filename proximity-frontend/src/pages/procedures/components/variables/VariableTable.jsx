import {
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VariablesIcon from "@mui/icons-material/DataObject";

export default function VariableTable({ items, onEditVariable, onDeleteVariable }) {
  const grouped = items.reduce((acc, item) => {
    const scope = item.scope || "Input";
    acc[scope] = acc[scope] || [];
    acc[scope].push(item);
    return acc;
  }, {});

  const entries = Object.entries(grouped);

  if (!items.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Nessuna variabile disponibile.</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {entries.map(([scope, scopeItems]) => (
        <Grid item xs={12} md={scope === "Secret" ? 12 : 6} key={scope}>
          <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ p: 2.2 }}>
              <VariablesIcon color="primary" />
              <Typography variant="h6" fontWeight={900}>{scope}</Typography>
              <Chip size="small" label={scopeItems.length} variant="outlined" />
            </Stack>

            <Divider />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Obbl.</TableCell>
                  <TableCell>Descrizione</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {scopeItems.map((item) => (
                  <TableRow key={item.id ?? `${item.scope}-${item.name}`} hover>
                    <TableCell>
                      <Typography fontWeight={850}>{item.name}</Typography>
                      {(item.defaultValue || item.default_value) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Default: {item.defaultValue ?? item.default_value}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.required ? "Sì" : "No"}</TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Modifica variabile">
                        <IconButton size="small" onClick={() => onEditVariable(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Elimina variabile">
                        <IconButton size="small" color="error" onClick={() => onDeleteVariable(item)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
