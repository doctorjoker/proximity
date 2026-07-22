import { Box, MenuItem, Stack, TextField } from "@mui/material";

export default function VariableSearchBar({ query, onQueryChange, type, types, onTypeChange }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <TextField
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cerca per nome, descrizione o origine..."
        size="small"
        fullWidth
        inputProps={{ "aria-label": "Cerca variabili" }}
        sx={{ bgcolor: "#fff" }}
      />
      <TextField
        select
        label="Tipo"
        value={type}
        onChange={(event) => onTypeChange(event.target.value)}
        size="small"
        sx={{ minWidth: { xs: "100%", sm: 150 }, bgcolor: "#fff" }}
      >
        <MenuItem value="ALL">Tutti i tipi</MenuItem>
        {types.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
      </TextField>
    </Stack>
  );
}
