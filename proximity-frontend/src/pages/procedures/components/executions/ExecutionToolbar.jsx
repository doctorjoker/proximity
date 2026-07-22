import {
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function ExecutionToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  mode,
  onModeChange,
  autoRefresh = false,
  onAutoRefreshChange = () => {},
}) {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={1.1} alignItems={{ xs: "stretch", lg: "center" }}>
      <TextField
        size="small"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cerca codice, procedura, workflow, richiedente..."
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 19, color: "#64748b" }} /></InputAdornment> }}
        sx={{ flex: 1, minWidth: { lg: 320 }, "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc", borderRadius: 2.2 } }}
      />

      <FormControl size="small" sx={{ minWidth: 145 }}>
        <InputLabel>Stato</InputLabel>
        <Select label="Stato" value={status} onChange={(event) => onStatusChange(event.target.value)} sx={{ borderRadius: 2.2 }}>
          <MenuItem value="ALL">Tutti</MenuItem>
          <MenuItem value="QUEUED">Queued</MenuItem>
          <MenuItem value="RUNNING">Running</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="FAILED">Failed</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 125 }}>
        <InputLabel>Modo</InputLabel>
        <Select label="Modo" value={mode} onChange={(event) => onModeChange(event.target.value)} sx={{ borderRadius: 2.2 }}>
          <MenuItem value="ALL">Tutti</MenuItem>
          <MenuItem value="TEST">Test</MenuItem>
          <MenuItem value="LIVE">Live</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        sx={{ ml: { lg: 0.5 }, mr: 0, px: 0.5 }}
        control={<Switch size="small" checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} />}
        label={<Typography variant="body2" sx={{ color: "#475569", fontWeight: 850 }}>Auto refresh</Typography>}
      />
    </Stack>
  );
}
