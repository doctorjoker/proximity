import PropTypes from "prop-types";
import {
  Badge,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

export default function WorkspaceToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Cerca...",
  onFilter,
  activeFilterCount = 0,
  onRefresh,
  refreshing = false,
  onExport,
  exportDisabled = false,
  primaryAction,
  secondaryActions = [],
  children,
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, boxShadow: "none" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
        <TextField
          size="small"
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={searchPlaceholder}
          inputProps={{ "aria-label": searchPlaceholder }}
          sx={{ width: { xs: "100%", md: 360 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchValue ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Cancella ricerca" onClick={() => onSearchChange?.("")}>
                  <ClearRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />

        {onFilter && (
          <Badge badgeContent={activeFilterCount} color="primary">
            <Button variant="outlined" startIcon={<FilterAltOutlinedIcon />} onClick={onFilter}>Filtri</Button>
          </Badge>
        )}

        {children}
        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.key || action.label} variant={action.variant || "text"} startIcon={Icon ? <Icon /> : undefined} onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            );
          })}

          {onRefresh && (
            <Tooltip title="Aggiorna">
              <span>
                <IconButton aria-label="Aggiorna" onClick={onRefresh} disabled={refreshing} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <RefreshRoundedIcon sx={{ animation: refreshing ? "ppl-spin 800ms linear infinite" : "none", "@keyframes ppl-spin": { to: { transform: "rotate(360deg)" } } }} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {onExport && (
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={onExport} disabled={exportDisabled}>Esporta</Button>
          )}

          {primaryAction && (
            <Button variant="contained" startIcon={primaryAction.icon ? <primaryAction.icon /> : undefined} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.label}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

WorkspaceToolbar.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  onFilter: PropTypes.func,
  activeFilterCount: PropTypes.number,
  onRefresh: PropTypes.func,
  refreshing: PropTypes.bool,
  onExport: PropTypes.func,
  exportDisabled: PropTypes.bool,
  primaryAction: PropTypes.object,
  secondaryActions: PropTypes.arrayOf(PropTypes.object),
  children: PropTypes.node,
};
