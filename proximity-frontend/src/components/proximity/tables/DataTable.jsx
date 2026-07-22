import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import TableLoading from './TableLoading'
import TableEmptyState from './TableEmptyState'

export default function DataTable({
  columns,
  rows,
  getRowId = (row, index) => row.id ?? index,
  onRowClick,
  selectedId,
  loading = false,
  emptyState,
  stickyHeader = true,
  size = 'small',
}) {
  if (loading) return <TableLoading />
  if (!rows?.length) return <TableEmptyState {...emptyState} />

  return (
    <TableContainer>
      <Table stickyHeader={stickyHeader} size={size}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} sx={column.headerSx}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const rowId = getRowId(row, index)
            return (
              <TableRow
                key={rowId}
                hover={Boolean(onRowClick)}
                selected={selectedId === rowId}
                onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align} sx={column.cellSx}>
                    {column.render ? column.render(row, index) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
