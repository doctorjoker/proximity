import React from "react";
import { MenuItem, Stack, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  SecondaryActionButton,
  TableToolbar,
} from "../proximity";

export default function CustomerFilters({
  query,
  onQueryChange,
  onSearch,
  onRefresh,
  loading,
  status,
  onStatusChange,
  profile,
  onProfileChange,
  profiles = [],
  onExport,
}) {
  const submitSearch = (event) => {
    event.preventDefault();
    onSearch?.();
  };

  return (
    <TableToolbar
      sx={{ mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      start={(
        <Stack
          component="form"
          onSubmit={submitSearch}
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            size="small"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cerca nome, contratto, PPPoE, comune..."
            inputProps={{ "aria-label": "Cerca clienti" }}
            sx={{ minWidth: { md: 330 } }}
          />
          <TextField
            select
            size="small"
            label="Stato"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            sx={{ minWidth: 145 }}
          >
            <MenuItem value="ALL">Tutti</MenuItem>
            <MenuItem value="LINKED">Collegati</MenuItem>
            <MenuItem value="UNLINKED">Senza CPE</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Profilo"
            value={profile}
            onChange={(event) => onProfileChange(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Tutti i profili</MenuItem>
            {profiles.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
          <SecondaryActionButton type="submit" size="compact" startIcon={<SearchIcon />}>
            Cerca
          </SecondaryActionButton>
        </Stack>
      )}
      end={(
        <Stack direction="row" spacing={1}>
          <SecondaryActionButton
            size="compact"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            loading={loading}
          >
            Aggiorna
          </SecondaryActionButton>
          <SecondaryActionButton
            size="compact"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={onExport}
          >
            Esporta CSV
          </SecondaryActionButton>
        </Stack>
      )}
    />
  );
}
