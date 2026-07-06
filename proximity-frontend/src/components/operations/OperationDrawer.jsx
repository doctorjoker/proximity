import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";

import DrawerHeader from "./drawer/DrawerHeader";
import DrawerCard from "./drawer/DrawerCard";
import DrawerInfoRow from "./drawer/DrawerInfoRow";
import WorkflowStepPipeline from "./workflow/WorkflowStepPipeline";
import WorkflowTimeline from "./workflow/WorkflowTimeline";

function statusColor(status) {
  if (status === "COMPLETED" || status === "SUCCESS") return "success";
  if (status === "RUNNING") return "primary";
  if (status === "FAILED" || status === "CANCELLED") return "error";
  if (status === "PAUSED") return "warning";
  return "default";
}

export default function OperationDrawer({
  open,
  operation,
  loading = false,
  onClose,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) {
  const workflow = operation?.workflow;
  const customer = operation?.customer || {};
  const service = operation?.service || {};
  const device = operation?.device || {};
  const steps = operation?.steps || [];
  const events = operation?.events || [];
  const controls = operation?.controls || {};

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 660,
          p: 3,
          bgcolor: "#f8fafc",
        },
      }}
    >
      {loading && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !workflow && (
        <Typography color="text.secondary">
          No workflow selected.
        </Typography>
      )}

      {!loading && workflow && (
        <>
          <DrawerHeader
            title={customer.name || workflow.workflow_code}
            subtitle={workflow.workflow_type}
            status={workflow.status}
            operationCode={workflow.workflow_code}
            onClose={onClose}
          />

          <Stack spacing={0}>
            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#4f46e5", fontWeight: 900 }}>
                Customer
              </Typography>

              <DrawerInfoRow label="Name" value={customer.name || "-"} />
              <DrawerInfoRow label="Customer ID" value={customer.customer_id || "-"} />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#16a34a", fontWeight: 900 }}>
                Service
              </Typography>

              <DrawerInfoRow
                label="Service Code"
                value={service.service_code || workflow.service_code}
              />
              <DrawerInfoRow label="Plan" value={service.plan || "-"} />
              <DrawerInfoRow label="Status" value={service.status || "-"} />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#2563eb", fontWeight: 900 }}>
                Workflow
              </Typography>

              <DrawerInfoRow label="Workflow Code" value={workflow.workflow_code} />
              <DrawerInfoRow label="Type" value={workflow.workflow_type} />
              <DrawerInfoRow label="Current Step" value={workflow.current_step} />
              <DrawerInfoRow label="Progress" value={`${workflow.progress || 0}%`} />
              <DrawerInfoRow
                label="ACS Device"
                value={device.acs_device_id || workflow.acs_device_id}
              />

              <Box sx={{ mt: 2 }}>
                <Chip
                  label={workflow.status}
                  color={statusColor(workflow.status)}
                  variant="outlined"
                />
              </Box>
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#7c3aed", fontWeight: 900 }}>
                Controls
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" disabled={!controls.can_pause} onClick={onPause}>
                  Pause
                </Button>

                <Button variant="outlined" disabled={!controls.can_resume} onClick={onResume}>
                  Resume
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  disabled={!controls.can_cancel}
                  onClick={onCancel}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  disabled={!controls.can_retry}
                  onClick={onRetry}
                >
                  Retry
                </Button>
              </Stack>
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#16a34a", fontWeight: 900 }}>
                Step Pipeline
              </Typography>

              <WorkflowStepPipeline steps={steps} />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#f59e0b", fontWeight: 900 }}>
                Timeline
              </Typography>

              <WorkflowTimeline events={events} />
            </DrawerCard>

            <DrawerCard>
              <Typography variant="overline" sx={{ color: "#64748b", fontWeight: 900 }}>
                Technical Details
              </Typography>

              <DrawerInfoRow label="Started At" value={workflow.started_at} />
              <DrawerInfoRow label="Completed At" value={workflow.completed_at || "-"} />
              <DrawerInfoRow label="Error Code" value={workflow.error_code || "-"} />
              <DrawerInfoRow label="Error Message" value={workflow.error_message || "-"} />
            </DrawerCard>
          </Stack>
        </>
      )}
    </Drawer>
  );
}
