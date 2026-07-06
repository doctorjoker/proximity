import { useEffect, useMemo, useState } from "react";

import AppLayout from "../components/layout/AppLayout";
import OperationsHeader from "../components/operations/OperationsHeader";
import OperationsSummary from "../components/operations/OperationsSummary";
import BusinessOperationsTable from "../components/operations/BusinessOperationsTable";
import OperationDrawer from "../components/operations/OperationDrawer";

const API = "/api/v1/service-workflows/business-dashboard?limit=50";

export default function WorkflowOperationsCenter() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadWorkflows() {
    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Errore caricamento workflow");
      }

      const data = await response.json();

      setWorkflows(data.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWorkflowDetails(workflowCode) {
    const response = await fetch(
      `/api/v1/service-workflows/${workflowCode}/details`,
    );

    if (!response.ok) {
      throw new Error("Errore caricamento dettaglio workflow");
    }

    return response.json();
  }

  async function openWorkflowDetails(workflow) {
    setSelectedWorkflow(workflow);
    setDetailsLoading(true);

    try {
      const data = await fetchWorkflowDetails(workflow.workflow_code);
      setWorkflowDetails(data);
    } catch (err) {
      setWorkflowDetails({
        workflow,
        steps: [],
        events: [],
        controls: {},
        error: err.message,
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  async function refreshSelectedWorkflowDetails() {
    const workflowCode =
      workflowDetails?.workflow?.workflow_code
      || selectedWorkflow?.workflow_code;

    if (!workflowCode) {
      return;
    }

    try {
      const data = await fetchWorkflowDetails(workflowCode);
      setWorkflowDetails(data);
    } catch (err) {
      setWorkflowDetails((current) => ({
        ...(current || {}),
        error: err.message,
      }));
    }
  }

  async function executeControl(action) {
    const workflowCode =
      workflowDetails?.workflow?.workflow_code
      || selectedWorkflow?.workflow_code;

    if (!workflowCode) {
      return;
    }

    await fetch(
      `/api/v1/service-workflows/${workflowCode}/${action}`,
      {
        method: "POST",
      },
    );

    await loadWorkflows();
    await refreshSelectedWorkflowDetails();
  }

  async function executeRetry() {
    const workflowCode =
      workflowDetails?.workflow?.workflow_code
      || selectedWorkflow?.workflow_code;

    if (!workflowCode) {
      return;
    }

    setDetailsLoading(true);

    try {
      const response = await fetch(
        `/api/v1/service-workflows/${workflowCode}/retry`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Errore retry workflow");
      }

      const data = await response.json();

      await loadWorkflows();

      const retryWorkflow = data.retry_workflow;

      if (retryWorkflow?.workflow_code) {
        setSelectedWorkflow(retryWorkflow);

        const details = await fetchWorkflowDetails(
          retryWorkflow.workflow_code,
        );

        setWorkflowDetails(details);
      } else {
        await refreshSelectedWorkflowDetails();
      }
    } catch (err) {
      setWorkflowDetails((current) => ({
        ...(current || {}),
        error: err.message,
      }));
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDrawer() {
    setSelectedWorkflow(null);
    setWorkflowDetails(null);
    setDetailsLoading(false);
  }

  useEffect(() => {
    loadWorkflows();

    const timer = setInterval(
      loadWorkflows,
      5000,
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedWorkflow) {
      return undefined;
    }

    const timer = setInterval(
      refreshSelectedWorkflowDetails,
      2000,
    );

    return () => clearInterval(timer);
  }, [selectedWorkflow, workflowDetails?.workflow?.workflow_code]);

  const summary = useMemo(() => ({
    pending: workflows.filter((item) => item.status === "CREATED").length,
    running: workflows.filter((item) => item.status === "RUNNING").length,
    completed: workflows.filter((item) => item.status === "COMPLETED").length,
    failed: workflows.filter((item) => (
      item.status === "FAILED" || item.status === "CANCELLED"
    )).length,
  }), [workflows]);

  return (
    <AppLayout>
      <OperationsHeader
        title="Workflow Operations Center"
        subtitle="Orchestrazione, controllo e audit dei workflow Proximity"
      />

      <OperationsSummary summary={summary} />

      <BusinessOperationsTable
        operations={workflows}
        loading={loading}
        error={error}
        onSelect={openWorkflowDetails}
      />

      <OperationDrawer
        open={selectedWorkflow !== null}
        operation={workflowDetails}
        loading={detailsLoading}
        onClose={closeDrawer}
        onPause={() => executeControl("pause")}
        onResume={() => executeControl("resume")}
        onCancel={() => executeControl("cancel")}
        onRetry={executeRetry}
      />
    </AppLayout>
  );
}
