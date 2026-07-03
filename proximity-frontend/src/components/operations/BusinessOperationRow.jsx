import {
  Chip,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";

import OperationStatusChip from "./OperationStatusChip";
import OperationProgress from "./OperationProgress";

export default function BusinessOperationRow({
  operation,
  onClick,
}) {
  return (
    <TableRow
      hover
      onClick={() => onClick?.(operation)}
      sx={{
        cursor: "pointer",
        transition: ".15s",

        "&:hover": {
          bgcolor: "#f8fafc",
        },
      }}
    >
      <TableCell>

        <Typography
          sx={{
            fontWeight: 700,
          }}
        >
          {operation.customer.name}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
        >
          {operation.customer.customer_id}
        </Typography>

      </TableCell>

      <TableCell>

        <Typography
          sx={{
            fontWeight: 600,
          }}
        >
          {operation.service.plan}
        </Typography>

        <Chip
          size="small"
          label={operation.service.status}
          sx={{
            mt: .5,
          }}
        />

      </TableCell>

      <TableCell>

        <Typography
          sx={{
            fontWeight: 600,
          }}
        >
          {operation.operation}
        </Typography>

      </TableCell>

      <TableCell>

        <OperationStatusChip
          status={operation.status}
        />

      </TableCell>

      <TableCell>

        {operation.current_step}

      </TableCell>

      <TableCell>

        {operation.assigned_worker || "-"}

      </TableCell>

      <TableCell width={170}>

        <OperationProgress
          value={operation.progress}
        />

      </TableCell>

    </TableRow>
  );
}
