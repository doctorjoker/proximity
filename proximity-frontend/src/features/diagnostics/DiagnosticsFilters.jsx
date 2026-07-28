import { FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField } from "@mui/material";

export default function DiagnosticsFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
  modelFilter,
  onModelFilterChange,
  firmwareFilter,
  onFirmwareFilterChange,
  models = [],
  firmwares = [],
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 4 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <TextField
          fullWidth
          label="Cerca cliente, seriale, modello o device code"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <FormControl sx={{ minWidth: 170 }}>
          <InputLabel>Connettività</InputLabel>
          <Select label="Connettività" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="ONLINE">Online</MenuItem>
            <MenuItem value="OFFLINE">Offline</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Rischio</InputLabel>
          <Select label="Rischio" value={riskFilter} onChange={(event) => onRiskFilterChange(event.target.value)}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="LOW">Basso</MenuItem>
            <MenuItem value="MEDIUM">Medio</MenuItem>
            <MenuItem value="HIGH">Alto</MenuItem>
            <MenuItem value="UNAVAILABLE">Non disponibile</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 190 }}>
          <InputLabel>Modello</InputLabel>
          <Select label="Modello" value={modelFilter} onChange={(event) => onModelFilterChange(event.target.value)}>
            <MenuItem value="ALL">Tutti i modelli</MenuItem>
            {models.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Firmware</InputLabel>
          <Select label="Firmware" value={firmwareFilter} onChange={(event) => onFirmwareFilterChange(event.target.value)}>
            <MenuItem value="ALL">Tutti i firmware</MenuItem>
            {firmwares.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    </Paper>
  );
}
