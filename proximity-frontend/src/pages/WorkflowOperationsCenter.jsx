import { useEffect, useMemo, useState } from "react";

import AppLayout from "../components/layout/AppLayout";
import OperationsHeader from "../components/operations/OperationsHeader";
import OperationsSummary from "../components/operations/OperationsSummary";
import BusinessOperationsTable from "../components/operations/BusinessOperationsTable";

import OperationDrawer from "../components/operations/OperationDrawer";

const API = "/api/v1/service-workflows/business-dashboard?limit=50";

export default function WorkflowOperationsCenter() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);

  async function loadOperations() {
    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Errore caricamento operazioni");
      }

      const data = await response.json();

      setOperations(data.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOperations();

    const timer = setInterval(
      loadOperations,
      5000,
    );

    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => ({
    pending: operations.filter((item) => item.status === "PENDING").length,
    running: operations.filter((item) => item.status === "RUNNING").length,
    completed: operations.filter((item) => item.status === "COMPLETED").length,
    failed: operations.filter((item) => item.status === "FAILED").length,
  }), [operations]);

  return (
    <AppLayout>
      <OperationsHeader
        title="Business Operations Center"
        subtitle="Customer, service and network operations managed by Proximity"
      />

      <OperationsSummary
        summary={summary}
      />

      <BusinessOperationsTable
        operations={operations}
        loading={loading}
        error={error}
        onSelect={setSelectedOperation}
      />
      <OperationDrawer
        open={selectedOperation !== null}
        operation={selectedOperation}
        onClose={() => setSelectedOperation(null)}
      />
    </AppLayout>
  );
}
