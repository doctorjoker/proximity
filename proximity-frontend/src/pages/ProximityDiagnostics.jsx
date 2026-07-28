import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, LinearProgress } from "@mui/material";
import {
  PrimaryActionButton,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
  WorkspaceToolbar,
} from "../components/proximity";
import { getProximityIconConfig } from "../components/icons/proximityIconRegistry";
import {
  DiagnosticsDrawer,
  DiagnosticsFilters,
  DiagnosticsKpiCards,
  DiagnosticsTable,
  isOperationalDevice,
  loadWithConcurrency,
  safeNumber,
  safeText,
} from "../features/diagnostics";

const API_BASE = "";
const RefreshIcon = getProximityIconConfig("DEVICE_REBOOT").icon;

export default function ProximityDiagnostics() {
  const [searchParams] = useSearchParams();
  const deepLinkDevice = searchParams.get("device") || "";
  const deepLinkQuery = searchParams.get("q") || "";
  const shouldOpenDeepLink = searchParams.get("open") !== "0";

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => deepLinkQuery);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [modelFilter, setModelFilter] = useState("ALL");
  const [firmwareFilter, setFirmwareFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selected, setSelected] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices`);
      if (!response.ok) throw new Error(`Inventario non disponibile (${response.status})`);
      const payload = await response.json();
      const inventory = payload.items || [];
      const operational = inventory.filter(isOperationalDevice);

      const diagnosticResults = await loadWithConcurrency(
        operational,
        async (device) => {
          const result = await fetch(`${API_BASE}/api/v1/devices/${device.id}/diagnostics`);
          if (!result.ok) return { ...device, diagnostics: null, diagnostics_error: `HTTP ${result.status}` };
          const data = await result.json();
          return {
            ...device,
            acs_device_id: data.acs_device_id || device.acs_device_id,
            diagnostics: data.diagnostics || null,
          };
        },
        5
      );

      const byId = new Map(diagnosticResults.map((item) => [item.id, item]));
      setDevices(inventory.map((device) => byId.get(device.id) || { ...device, diagnostics: null, excluded_from_monitoring: true }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Errore caricamento diagnostica");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const models = useMemo(() => Array.from(new Set(devices.map((device) => safeText(device.model, "")).filter(Boolean))).sort(), [devices]);
  const firmwares = useMemo(() => Array.from(new Set(devices.map((device) => safeText(device.software_version, "")).filter(Boolean))).sort(), [devices]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return devices.filter((device) => {
      if (statusFilter === "ONLINE" && !device.online) return false;
      if (statusFilter === "OFFLINE" && device.online) return false;
      const risk = device.diagnostics?.risk_level || "UNAVAILABLE";
      if (riskFilter !== "ALL" && risk !== riskFilter) return false;
      if (modelFilter !== "ALL" && safeText(device.model, "") !== modelFilter) return false;
      if (firmwareFilter !== "ALL" && safeText(device.software_version, "") !== firmwareFilter) return false;
      if (!text) return true;
      return [
        device.device_code,
        device.serial_number,
        device.manufacturer,
        device.model,
        device.software_version,
        device.customer_name,
        device.service_code,
      ]
        .map((value) => safeText(value, "").toLowerCase())
        .join(" ")
        .includes(text);
    });
  }, [devices, query, statusFilter, riskFilter, modelFilter, firmwareFilter]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const kpi = useMemo(() => {
    const monitored = devices.filter((device) => device.diagnostics);
    const scores = monitored.map((device) => safeNumber(device.diagnostics?.health_score, null)).filter((value) => value !== null);
    const averageHealth = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
    return {
      total: devices.length,
      monitored: monitored.length,
      online: devices.filter((device) => device.online).length,
      offline: devices.filter((device) => !device.online).length,
      averageHealth,
      good: monitored.filter((device) => safeNumber(device.diagnostics?.health_score, 0) >= 85).length,
      warning: monitored.filter((device) => {
        const score = safeNumber(device.diagnostics?.health_score, 0);
        return score >= 65 && score < 85;
      }).length,
      critical: monitored.filter((device) => safeNumber(device.diagnostics?.health_score, 100) < 65).length,
      highResources: monitored.filter((device) => safeNumber(device.diagnostics?.cpu_usage_percent, 0) >= 80 || safeNumber(device.diagnostics?.memory_used_percent, 0) >= 80).length,
    };
  }, [devices]);

  const openDevice = async (device) => {
    setSelected(device);
    if (device.diagnostics || device.excluded_from_monitoring) return;
    setDrawerLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${device.id}/diagnostics`);
      const data = response.ok ? await response.json() : null;
      const updated = { ...device, acs_device_id: data?.acs_device_id || device.acs_device_id, diagnostics: data?.diagnostics || null };
      setSelected(updated);
      setDevices((current) => current.map((item) => item.id === updated.id ? updated : item));
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    if (loading || deepLinkHandled || !deepLinkDevice) return;

    const target = devices.find((device) =>
      String(device.id) === String(deepLinkDevice) ||
      safeText(device.device_code, "") === deepLinkDevice ||
      safeText(device.serial_number, "") === deepLinkDevice ||
      safeText(device.acs_device_id, "") === deepLinkDevice
    );

    if (!target) return;

    if (!query) {
      setQuery(safeText(target.device_code, safeText(target.serial_number, "")));
    }

    if (shouldOpenDeepLink) {
      openDevice(target);
    }

    setDeepLinkHandled(true);
  }, [loading, devices, deepLinkDevice, deepLinkHandled, query, shouldOpenDeepLink]);

  const addSessionEvent = (deviceId, type, title, detail) => {
    const event = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      detail,
      timestamp: new Date().toISOString(),
    };
    setDevices((current) => current.map((item) => item.id === deviceId
      ? { ...item, diagnostics_events: [event, ...(item.diagnostics_events || [])] }
      : item));
    setSelected((current) => current?.id === deviceId
      ? { ...current, diagnostics_events: [event, ...(current.diagnostics_events || [])] }
      : current);
  };

  const runTask = async (device, task) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${device.id}/tasks/${task}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.detail || `Errore ${task}`);
      addSessionEvent(
        device.id,
        task,
        task === "refresh" ? "Refresh ACS richiesto" : "Reboot CPE richiesto",
        task === "refresh" ? "Comando di aggiornamento parametri inviato al dispositivo" : "Comando di riavvio inviato al dispositivo"
      );
      window.alert(`${task === "refresh" ? "Refresh ACS" : "Reboot"} inviato correttamente.`);
    } catch (err) {
      window.alert(err.message || `Errore esecuzione ${task}`);
    } finally {
      setActionLoading(false);
    }
  };

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  return (
    <>
      <WorkspaceLayout
        header={
          <WorkspaceHeader
            iconDomain="DIAGNOSTICS"
            breadcrumbs={["Operations", "Diagnostics"]}
            eyebrow="DEVICE ASSURANCE"
            title="Diagnostics Workspace"
            subtitle="Health, risorse, uptime e operazioni ACS sui CPE gestiti da Proximity."
            status={`${kpi.online}/${kpi.total} online`}
            metadata={[
              { label: "Monitorati", value: kpi.monitored },
              { label: "Health medio", value: kpi.averageHealth ?? "—" },
              { label: "Warning", value: kpi.warning },
              { label: "Critical", value: kpi.critical },
            ]}
            actions={
              <WorkspaceToolbar>
                <PrimaryActionButton startIcon={<RefreshIcon size={18} stroke={1.9} />} onClick={loadDiagnostics} disabled={loading}>
                  Aggiorna diagnostica
                </PrimaryActionButton>
              </WorkspaceToolbar>
            }
          />
        }
      >
        <Box sx={{ maxWidth: 1560, mx: "auto", width: "100%" }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <WorkspaceSection
            eyebrow="Assurance"
            title="Stato operativo CPE"
            description="Diagnostica aggregata con health score, risorse e caricamento controllato degli endpoint device-level. I record DiscoveryService restano visibili ma non vengono interrogati automaticamente."
            sx={{ mb: 3 }}
          >
            <DiagnosticsKpiCards kpi={kpi} />
          </WorkspaceSection>
          <DiagnosticsFilters
            query={query}
            onQueryChange={resetPage(setQuery)}
            statusFilter={statusFilter}
            onStatusFilterChange={resetPage(setStatusFilter)}
            riskFilter={riskFilter}
            onRiskFilterChange={resetPage(setRiskFilter)}
            modelFilter={modelFilter}
            onModelFilterChange={resetPage(setModelFilter)}
            firmwareFilter={firmwareFilter}
            onFirmwareFilterChange={resetPage(setFirmwareFilter)}
            models={models}
            firmwares={firmwares}
          />
          <DiagnosticsTable
            rows={paged}
            total={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            loading={loading}
            onOpen={openDevice}
            onPageChange={(event, value) => setPage(value)}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
          />
        </Box>
      </WorkspaceLayout>
      <DiagnosticsDrawer
        open={Boolean(selected)}
        device={selected}
        loading={drawerLoading}
        actionLoading={actionLoading}
        onClose={() => setSelected(null)}
        onRefresh={(device) => runTask(device, "refresh")}
        onReboot={(device) => runTask(device, "reboot")}
      />
    </>
  );
}
