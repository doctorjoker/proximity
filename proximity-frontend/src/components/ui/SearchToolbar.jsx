import { Button, InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { Download, Refresh, Search } from "@mui/icons-material";
import SurfaceCard from "./SurfaceCard";

export default function SearchToolbar({
  value,
  onChange,
  onSearch,
  onRefresh,
  loading,
  placeholder,
  status = "ALL",
  onStatusChange,
  profile = "ALL",
  onProfileChange,
  profiles = [],
  onExport,
}) {
  return (
    <SurfaceCard sx={{ mb: 2.5 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.35} alignItems={{ xs: "stretch", lg: "center" }} sx={{ p: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          placeholder={placeholder || "Cerca..."}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: { lg: 420 }, flex: 1 }}
        />

        {onStatusChange ? (
          <TextField select size="small" label="Stato" value={status} onChange={(event) => onStatusChange(event.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="LINKED">Con CPE</MenuItem>
            <MenuItem value="UNLINKED">Senza CPE</MenuItem>
          </TextField>
        ) : null}

        {onProfileChange ? (
          <TextField select size="small" label="Profilo" value={profile} onChange={(event) => onProfileChange(event.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="ALL">Tutti</MenuItem>
            {profiles.map((item) => (
              <MenuItem value={item} key={item}>{item}</MenuItem>
            ))}
          </TextField>
        ) : null}

        <Button variant="contained" onClick={onSearch} disabled={loading} sx={{ px: 2.8, textTransform: "none", fontWeight: 900, minHeight: 40 }}>
          Cerca
        </Button>
        {onExport ? (
          <Button variant="outlined" startIcon={<Download />} onClick={onExport} disabled={loading} sx={{ px: 2, textTransform: "none", fontWeight: 900, minHeight: 40 }}>
            Esporta
          </Button>
        ) : null}
        <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh} disabled={loading} sx={{ px: 2, textTransform: "none", fontWeight: 900, minHeight: 40 }}>
          Aggiorna
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
