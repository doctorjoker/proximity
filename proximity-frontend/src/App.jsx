import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProximityExperience from "./pages/ProximityExperience";
import CustomerCareDashboard from "./pages/CustomerCareDashboard";
import SuspendedPortal from "./pages/SuspendedPortal";
import WorkflowOperationsCenter from "./pages/WorkflowOperationsCenter";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProximityExperience />} />
        <Route path="/customer-care" element={<CustomerCareDashboard />} />
        <Route path="/workflow-operations" element={<WorkflowOperationsCenter />} />
        <Route path="/suspended" element={<SuspendedPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
