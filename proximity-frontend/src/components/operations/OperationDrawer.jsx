import {
  Box,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";

import OperationProgress from "./OperationProgress";
import DrawerHeader from "./drawer/DrawerHeader";
import DrawerCard from "./drawer/DrawerCard";
import DrawerInfoRow from "./drawer/DrawerInfoRow";
import DrawerTimeline from "./drawer/DrawerTimeline";

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
          width: 560,
          p: 3,
          bgcolor: "#f8fafc",
        },
      }}
    >
      {!operation && (
        <Typography color="text.secondary">
          No operation selected.
        </Typography>
      )}

      {operation && (
        <>
          <DrawerHeader
            title={operation.operation}
            subtitle="Customer network operation"
            status={operation.status}
            operationCode={operation.service.service_code}
            onClose={onClose}
          />

          <Stack spacing={0}>
            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#4f46e5", fontWeight: 900 }}>
                Customer
              </Typography>

              <DrawerInfoRow
                label="Name"
                value={operation.customer.name}
              />

              <DrawerInfoRow
                label="Customer ID"
                value={operation.customer.customer_id}
              />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#16a34a", fontWeight: 900 }}>
                Service
              </Typography>

              <DrawerInfoRow
                label="Plan"
                value={operation.service.plan}
              />

              <DrawerInfoRow
                label="Status"
                value={operation.service.status}
              />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#2563eb", fontWeight: 900 }}>
                Device
              </Typography>

              <DrawerInfoRow
                label="ACS Device"
                value={operation.device.acs_device_id}
              />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#f59e0b", fontWeight: 900 }}>
                Execution
              </Typography>

              <DrawerInfoRow
                label="Current Step"
                value={operation.current_step}
              />

              <Box sx={{ my: 2 }}>
                <OperationProgress value={operation.progress} />
              </Box>

              <DrawerInfoRow
                label="Worker"
                value={operation.assigned_worker}
              />
            </DrawerCard>

            <DrawerCard>
              <DrawerTimeline
                workflowCode={operation.workflow_code}
              />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#64748b", fontWeight: 900 }}>
                Technical Details
              </Typography>

              <DrawerInfoRow
                label="Workflow"
                value={operation.workflow_code}
              />

              <DrawerInfoRow
                label="Operation"
                value={operation.operation_code}
              />

              <DrawerInfoRow
                label="Retry"
                value={operation.retry_count}
              />
            </DrawerCard>
          </Stack>
        </>
      )}
    </Drawer>
  );
}
