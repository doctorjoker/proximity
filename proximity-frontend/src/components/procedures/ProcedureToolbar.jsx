import {
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

export const PROCEDURE_FILTERS = [
  { value: "ALL", label: "Tutte" },
  { value: "PUBLISHED", label: "Attive" },
  { value: "DRAFT", label: "Con bozza" },
  { value: "DEPRECATED", label: "Storiche" },
];

export default function ProcedureToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onRefresh,
  refreshing = false,
}) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
      }}
    >
      <CardContent sx={{ p: 2.2, "&:last-child": { pb: 2.2 } }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1.25}
            sx={{ minWidth: 0, flex: 1 }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Cerca per nome, codice o descrizione..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 560,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                },
              }}
            />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {PROCEDURE_FILTERS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  clickable
                  color={filter === item.value ? "primary" : "default"}
                  variant={filter === item.value ? "filled" : "outlined"}
                  onClick={() => onFilterChange(item.value)}
                  sx={{ borderRadius: 2, fontWeight: 900, px: 0.5 }}
                />
              ))}
            </Stack>
          </Stack>

          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={refreshing}
            sx={{ textTransform: "none", fontWeight: 800, alignSelf: { xs: "flex-start", lg: "center" } }}
          >
            Aggiorna
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
