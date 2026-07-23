import {
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'

const statusLabel = {
  idle: 'Pronta',
  running: 'In esecuzione',
  completed: 'Completata',
  stopped: 'Interrotta',
  error: 'Errore',
}

const statusColor = {
  running: 'primary',
  completed: 'success',
  stopped: 'warning',
  error: 'error',
}

export default function SimulationPanel({
  simulation,
  speed = 1,
  onSpeedChange,
  onStart,
  onNext,
  onStop,
  onReset,
  onReplay,
}) {
  const history = Array.isArray(simulation?.history) ? simulation.history : []
  const running = simulation?.status === 'running'
  const completedCount = history.filter((item) => item.completed).length
  const total = Math.max(history.length, Number(simulation?.totalNodes || 0))
  const currentStep = history.length
  const progress = total ? Math.round((completedCount / total) * 100) : 0
  const replayAvailable = simulation?.status === 'completed' || simulation?.status === 'stopped'

  return (
    <Paper
      elevation={10}
      sx={{
        position: 'fixed',
        top: 76,
        right: 16,
        zIndex: 1400,
        width: 350,
        maxHeight: 'calc(100vh - 92px)',
        overflow: 'hidden',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={1.25} sx={{ p: 1.6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              EUREKA 12.4.1
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              Simulatore
            </Typography>
          </Box>
          <Chip
            size="small"
            label={statusLabel[simulation?.status] || 'Pronta'}
            color={statusColor[simulation?.status] || 'default'}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={simulation?.status === 'completed' ? 100 : progress}
              sx={{ height: 7, borderRadius: 999 }}
            />
          </Box>
          <Typography variant="caption" fontWeight={800} sx={{ minWidth: 52, textAlign: 'right' }}>
            {total ? `${Math.min(currentStep, total)}/${total}` : '0/0'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap alignItems="center">
          <Button
            size="small"
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={onStart}
            disabled={running}
          >
            Simula
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SkipNextRoundedIcon />}
            onClick={onNext}
            disabled={!running}
          >
            Avanti
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<StopRoundedIcon />}
            onClick={onStop}
            disabled={!running}
          >
            Stop
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={replayAvailable ? <ReplayRoundedIcon /> : <RestartAltRoundedIcon />}
            onClick={replayAvailable ? onReplay : onReset}
          >
            {replayAvailable ? 'Replay' : 'Reset'}
          </Button>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {completedCount} fasi completate · {simulation?.status === 'completed' ? 100 : progress}%
          </Typography>
          <Stack direction="row" spacing={0.6} alignItems="center">
            <Typography variant="caption" color="text.secondary">Velocità</Typography>
            <Select
              size="small"
              value={speed}
              onChange={(event) => onSpeedChange?.(Number(event.target.value))}
              disabled={running}
              sx={{ height: 30, minWidth: 68, fontSize: 12 }}
            >
              <MenuItem value={1}>1x</MenuItem>
              <MenuItem value={2}>2x</MenuItem>
              <MenuItem value={4}>4x</MenuItem>
            </Select>
          </Stack>
        </Stack>
      </Stack>

      <Divider />

      <Box sx={{ p: 1.6, overflowY: 'auto', maxHeight: 440 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.2 }}>
          Timeline
        </Typography>

        {!history.length ? (
          <Typography variant="body2" color="text.secondary">
            Premi Simula per avviare il percorso automatico della procedura.
          </Typography>
        ) : (
          <Stack spacing={1.15}>
            {history.map((item, index) => {
              const isError = simulation?.status === 'error' && index === history.length - 1
              const active = !item.completed && index === history.length - 1
              return (
                <Stack key={`${item.nodeId}-${index}`} direction="row" spacing={1} alignItems="flex-start">
                  {isError ? (
                    <ErrorOutlineRoundedIcon color="error" fontSize="small" />
                  ) : item.completed ? (
                    <CheckCircleRoundedIcon color="success" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon color="primary" fontSize="small" />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={active ? 900 : 700}>
                      {index + 1}. {item.label || item.nodeId}
                    </Typography>
                    {item.transitionType ? (
                      <Typography variant="caption" color="text.secondary">
                        Transizione percorsa: {item.transitionType}
                      </Typography>
                    ) : active ? (
                      <Typography variant="caption" color="primary.main" fontWeight={700}>
                        Fase corrente
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  )
}
