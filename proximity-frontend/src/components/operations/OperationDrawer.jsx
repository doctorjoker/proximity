import {
  Box,
  Divider,
  Drawer,
  Typography,
} from "@mui/material";

export default function OperationDrawer({
  open,
  operation,
  onClose,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 430,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
          }}
        >
          Business Operation
        </Typography>

        <Divider sx={{ my: 2 }} />

        {!operation && (
          <Typography color="text.secondary">
            No operation selected.
          </Typography>
        )}

        {operation && (
          <>
            <Typography variant="h6">
              {operation.customer.name}
            </Typography>

            <Typography
              color="text.secondary"
            >
              {operation.customer.customer_id}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography>
              {operation.service.plan}
            </Typography>

            <Typography
              color="text.secondary"
            >
              {operation.operation}
            </Typography>
          </>
        )}
      </Box>
    </Drawer>
  );
}
