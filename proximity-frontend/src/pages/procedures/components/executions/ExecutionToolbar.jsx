import {
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function ExecutionToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  mode,
  onModeChange,
  onRefresh,
  loading,
  autoRefresh = false,
  onAutoRefreshChange = () => {},
}) {
  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", lg: "center" }}
      justifyContent="space-between"
    >
      <Stack spacing={0.3}>
        <Typography variant="h5" fontWeight={950} sx={{ letterSpacing: -0.3 }}>
          Execution Center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitoraggio esecuzioni procedure e workflow runtime.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          label="Cerca"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="PEX, workflow, procedura..."
          sx={{ minWidth: { xs: "100%", sm: 240 } }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Stato</InputLabel>
          <Select label="Stato" value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="QUEUED">Queued</MenuItem>
            <MenuItem value="RUNNING">Running</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Modo</InputLabel>
          <Select label="Modo" value={mode} onChange={(event) => onModeChange(event.target.value)}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="TEST">Test</MenuItem>
            <MenuItem value="LIVE">Live</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          sx={{ ml: { sm: 0.5 }, mr: 0 }}
          control={
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={(event) => onAutoRefreshChange(event.target.checked)}
            />
          }
          label={<Typography variant="body2" fontWeight={800}>Auto refresh</Typography>}
        />

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{ height: 40, borderRadius: 2, textTransform: "none", fontWeight: 850 }}
        >
          Aggiorna
        </Button>
      </Stack>
    </Stack>
  );
}
