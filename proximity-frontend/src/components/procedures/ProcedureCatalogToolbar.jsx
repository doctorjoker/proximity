import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined'
import SearchIcon from '@mui/icons-material/Search'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'ACTIVE', label: 'Attive' },
  { value: 'DRAFT', label: 'Con bozza' },
  { value: 'HISTORICAL', label: 'Storiche' },
]

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Tutte le categorie' },
  { value: 'PROVISIONING', label: 'Provisioning' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'ACS', label: 'ACS' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OTHER', label: 'Altro' },
]

const TRIGGER_OPTIONS = [
  { value: 'ALL', label: 'Tutti i trigger' },
  { value: 'MANUAL', label: 'Manuale' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'SCHEDULED', label: 'Scheduler' },
  { value: 'API', label: 'API' },
]

function CompactSelect({ label, value, onChange, options, minWidth = 170 }) {
  return (
    <FormControl size="small" sx={{ minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default function ProcedureCatalogToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  trigger,
  onTriggerChange,
  resultCount,
  totalCount,
  onReset,
  onCreate,
}) {
  const hasFilters = Boolean(search) || status !== 'ALL' || category !== 'ALL' || trigger !== 'ALL'

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 1.5,
      }}
    >
      <Stack spacing={1.35}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.2}
          alignItems={{ xs: 'stretch', lg: 'center' }}
        >
          <TextField
            size="small"
            fullWidth
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cerca per nome, codice o descrizione..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { lg: 340 },
              flex: 1,
              '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' },
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} useFlexGap flexWrap="wrap">
            <CompactSelect label="Stato" value={status} onChange={onStatusChange} options={STATUS_OPTIONS} />
            <CompactSelect label="Categoria" value={category} onChange={onCategoryChange} options={CATEGORY_OPTIONS} minWidth={185} />
            <CompactSelect label="Trigger" value={trigger} onChange={onTriggerChange} options={TRIGGER_OPTIONS} />
          </Stack>

          <Tooltip title={hasFilters ? 'Azzera ricerca e filtri' : 'Nessun filtro attivo'}>
            <span>
              <Button
                variant="outlined"
                startIcon={<FilterAltOffOutlinedIcon />}
                disabled={!hasFilters}
                onClick={onReset}
                sx={{ minHeight: 40, textTransform: 'none', fontWeight: 850, whiteSpace: 'nowrap' }}
              >
                Azzera
              </Button>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreate}
            sx={{ minHeight: 40, textTransform: 'none', fontWeight: 900, whiteSpace: 'nowrap', boxShadow: 'none' }}
          >
            Nuova procedura
          </Button>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            {resultCount} di {totalCount} procedure visibili
          </Typography>
          {hasFilters && <Chip size="small" label="Filtri attivi" color="primary" variant="outlined" sx={{ fontWeight: 850 }} />}
        </Stack>
      </Stack>
    </Paper>
  )
}
