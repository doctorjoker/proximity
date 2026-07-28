import { Box, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { WorkspaceFilters } from "../../components/proximity";

export default function AnalyticsFilters({ query, onQueryChange, vendor, onVendorChange, model, onModelChange, vendors, models }) {
  return <WorkspaceFilters sx={{ mb: 3 }}>
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ width: "100%" }}>
      <TextField fullWidth size="small" label="Cerca device, seriale o firmware" value={query} onChange={(e) => onQueryChange(e.target.value)} />
      <FormControl size="small" sx={{ minWidth: 210 }}><InputLabel>Vendor</InputLabel><Select label="Vendor" value={vendor} onChange={(e) => onVendorChange(e.target.value)}><MenuItem value="ALL">Tutti</MenuItem>{vendors.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
      <FormControl size="small" sx={{ minWidth: 210 }}><InputLabel>Modello</InputLabel><Select label="Modello" value={model} onChange={(e) => onModelChange(e.target.value)}><MenuItem value="ALL">Tutti</MenuItem>{models.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
    </Stack>
  </WorkspaceFilters>;
}
