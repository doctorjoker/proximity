import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProximityExperience from "./pages/ProximityExperience";
import CustomerCareDashboard from "./pages/CustomerCareDashboard";
import SuspendedPortal from "./pages/SuspendedPortal";
import WorkflowOperationsCenter from "./pages/WorkflowOperationsCenter";

import ProcedureLibrary from "./pages/procedures/ProcedureLibrary";
import ProcedureDetails from "./pages/procedures/ProcedureDetails";
import ProcedureVersions from "./pages/procedures/ProcedureVersions";
import ProcedureEditor from "./pages/procedures/ProcedureEditor";
import ProcedureVersionDetails from "./pages/procedures/ProcedureVersionDetails";

import ProcedureExecutionCenter from "./pages/procedures/ProcedureExecutionCenter";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProximityExperience />} />
        <Route path="/customer-care" element={<CustomerCareDashboard />} />
        <Route path="/workflow-operations" element={<WorkflowOperationsCenter />} />
        <Route path="/suspended" element={<SuspendedPortal />} />

        <Route path="/procedures" element={<ProcedureLibrary />} />
        <Route
          path="/procedures/:definitionCode"
          element={<ProcedureDetails />}
        />
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
        <Route
          path="/procedures/executions"
          element={<ProcedureExecutionCenter />}
        />

      </Routes>
    </BrowserRouter>
  );
}
