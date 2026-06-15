import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProximityExperience from "./pages/ProximityExperience";
import CustomerCareDashboard from "./pages/CustomerCareDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProximityExperience />} />
        <Route path="/customer-care" element={<CustomerCareDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
