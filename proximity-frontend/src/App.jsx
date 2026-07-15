import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import ProximityControlCenter from "./pages/ProximityControlCenter";
import Customers from "./pages/Customers";
import CustomerCareDashboard from "./pages/CustomerCareDashboard";
import SuspendedPortal from "./pages/SuspendedPortal";
import WorkflowOperationsCenter from "./pages/WorkflowOperationsCenter";

import ProcedureLibrary from "./pages/procedures/ProcedureLibrary";
import ProcedureDetails from "./pages/procedures/ProcedureDetails";
import ProcedureVersions from "./pages/procedures/ProcedureVersions";
import ProcedureEditor from "./pages/procedures/ProcedureEditor";
import ProcedureVersionDetails from "./pages/procedures/ProcedureVersionDetails";
import ProcedureExecutionCenter from "./pages/procedures/ProcedureExecutionCenter";

function ModulePlaceholder({ title, description }) {
  return (
    <AppLayout>
      <Box sx={{ maxWidth: 1100, mx: "auto", py: 4 }}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            borderColor: "divider",
            background: "linear-gradient(135deg, rgba(30,90,168,0.08), rgba(56,189,248,0.05))",
          }}
        >
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="overline" color="primary" fontWeight={900}>
              EUREKA 10 · Product consolidation
            </Typography>
            <Typography variant="h4" fontWeight={950}>
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
              {description}
            </Typography>
            <Button variant="contained" href="/">
              Torna alla Dashboard
            </Button>
          </Stack>
        </Paper>
      </Box>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProximityControlCenter />} />

        <Route path="/customers" element={<Customers />} />
        <Route path="/customer-care" element={<CustomerCareDashboard />} />

        <Route path="/workflow-operations" element={<WorkflowOperationsCenter />} />
        <Route path="/suspended" element={<SuspendedPortal />} />

        <Route path="/procedures" element={<ProcedureLibrary />} />
        <Route path="/procedures/:definitionCode" element={<ProcedureDetails />} />
        <Route
          path="/procedures/:definitionCode/versions"
          element={<ProcedureVersions />}
        />
        <Route
          path="/procedures/:definitionCode/editor"
          element={<ProcedureEditor />}
        />
        <Route
          path="/procedures/:procedureCode/versions/:version"
          element={<ProcedureVersionDetails />}
        />

        <Route path="/procedure-executions" element={<ProcedureExecutionCenter />} />
        <Route
          path="/procedures/executions"
          element={<Navigate to="/procedure-executions" replace />}
        />

        <Route
          path="/devices"
          element={
            <ModulePlaceholder
              title="Devices"
              description="Il modulo Devices verrà collegato alla nuova architettura di prodotto nella milestone Operations Consolidation. La route è già ufficiale e non è più orfana."
            />
          }
        />
        <Route
          path="/firmware"
          element={
            <ModulePlaceholder
              title="Firmware"
              description="Catalogo firmware, campagne e upgrade job verranno migrati nel nuovo Design System mantenendo le API esistenti."
            />
          }
        />
        <Route
          path="/diagnostics"
          element={
            <ModulePlaceholder
              title="Diagnostics"
              description="La diagnostica verrà consolidata nella nuova esperienza Operations senza perdere le funzionalità già disponibili."
            />
          }
        />
        <Route
          path="/analytics"
          element={
            <ModulePlaceholder
              title="Analytics"
              description="Analytics diventerà la vista aggregata di Automation, dispositivi, firmware e customer experience."
            />
          }
        />
        <Route
          path="/administration"
          element={
            <ModulePlaceholder
              title="Administration"
              description="Configurazioni di piattaforma, runtime e integrazioni verranno raccolte in questa area amministrativa."
            />
          }
        />
        <Route path="/settings" element={<Navigate to="/administration" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
