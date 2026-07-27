import { TextField } from '@mui/material'

export default function WorkspaceNavigationSearch({ value, onChange, placeholder = 'Cerca...', inputRef }) {
  return (
    <TextField
      inputRef={inputRef}
      size="small"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      fullWidth
      inputProps={{ 'aria-label': placeholder }}
      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', borderRadius: 2, fontSize: 13.5 } }}
    />
  )
}
