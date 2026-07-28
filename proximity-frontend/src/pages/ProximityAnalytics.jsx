import { useEffect, useMemo, useState } from "react";
import { Alert, Box, LinearProgress } from "@mui/material";
import {
  PrimaryActionButton,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
  WorkspaceToolbar,
} from "../components/proximity";
import ProximityActionIcon from "../components/icons/ProximityActionIcon";
import {
  AnalyticsDistributionCard,
  AnalyticsDrawer,
  AnalyticsFilters,
  AnalyticsInsights,
  AnalyticsKpiCards,
  groupCount,
  healthBucket,
  isOperationalDevice,
  loadWithConcurrency,
  safeNumber,
  safeText,
} from "../features/analytics";

const API_BASE = "";

export default function ProximityAnalytics() {
  const [devices, setDevices] = useState([]);
  const [firmwareCatalog, setFirmwareCatalog] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("ALL");
  const [model, setModel] = useState("ALL");
  const [drawer, setDrawer] = useState(null);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [devicesRes, firmwareRes, jobsRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/devices`), fetch(`${API_BASE}/api/v1/firmware/catalog`), fetch(`${API_BASE}/api/v1/firmware/jobs`), fetch(`${API_BASE}/api/v1/customer-services`),
      ]);
      const [devicesData, firmwareData, jobsData, servicesData] = await Promise.all([devicesRes.json(), firmwareRes.json(), jobsRes.json(), servicesRes.json()]);
      if (!devicesRes.ok) throw new Error(devicesData?.detail || "Inventario non disponibile");
      const inventory = devicesData.items || [];
      const operational = inventory.filter(isOperationalDevice);
      const diagnostics = await loadWithConcurrency(operational, async (device) => {
        const response = await fetch(`${API_BASE}/api/v1/devices/${device.id}/diagnostics`);
        if (!response.ok) return { ...device, diagnostics: null };
        const payload = await response.json();
        return { ...device, diagnostics: payload.diagnostics || null };
      }, 5);
      setDevices(diagnostics); setFirmwareCatalog(firmwareData.items || []); setJobs(jobsData.items || []); setServices(servicesData.items || []);
    } catch (err) { console.error(err); setError(err.message || "Errore caricamento Analytics"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const vendors = useMemo(() => [...new Set(devices.map((d) => safeText(d.manufacturer, "")).filter(Boolean))].sort(), [devices]);
  const models = useMemo(() => [...new Set(devices.map((d) => safeText(d.model, "")).filter(Boolean))].sort(), [devices]);
  const filtered = useMemo(() => devices.filter((d) => {
    if (vendor !== "ALL" && safeText(d.manufacturer, "") !== vendor) return false;
    if (model !== "ALL" && safeText(d.model, "") !== model) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return [d.device_code,d.serial_number,d.manufacturer,d.model,d.software_version,d.customer_name].map((v) => safeText(v, "").toLowerCase()).join(" ").includes(text);
  }), [devices, vendor, model, query]);

  const latestFirmwareByModel = useMemo(() => {
    const map = new Map();
    firmwareCatalog.forEach((fw) => { if (fw.stable) map.set(`${safeText(fw.vendor)}|${safeText(fw.model)}`, safeText(fw.version)); });
    return map;
  }, [firmwareCatalog]);

  const kpi = useMemo(() => {
    const online = filtered.filter((d) => d.online).length;
    const monitored = filtered.filter((d) => d.diagnostics);
    const scores = monitored.map((d) => safeNumber(d.diagnostics?.health_score, null)).filter((v) => v !== null);
    const compliant = filtered.filter((d) => {
      const expected = latestFirmwareByModel.get(`${safeText(d.manufacturer)}|${safeText(d.model)}`);
      return expected && safeText(d.software_version, "").includes(expected);
    }).length;
    return {
      operational: filtered.length, online, offline: filtered.length - online,
      onlineRate: filtered.length ? (online / filtered.length) * 100 : 0,
      averageHealth: scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : null,
      critical: monitored.filter((d) => safeNumber(d.diagnostics?.health_score, 100) < 65).length,
      firmwareCompliance: filtered.length ? (compliant / filtered.length) * 100 : 0,
      outdated: Math.max(0, filtered.length - compliant),
      activeServices: services.filter((s) => safeText(s.commercial_status, s.status).toUpperCase() === "ACTIVE").length,
      suspendedServices: services.filter((s) => safeText(s.commercial_status, "").toUpperCase() === "SUSPENDED").length,
    };
  }, [filtered, latestFirmwareByModel, services]);

  const health = useMemo(() => groupCount(filtered.filter((d) => d.diagnostics), (d) => healthBucket(d.diagnostics?.health_score)), [filtered]);
  const firmware = useMemo(() => groupCount(filtered, (d) => d.software_version || "Senza versione"), [filtered]);
  const vendorDistribution = useMemo(() => groupCount(filtered, (d) => d.manufacturer), [filtered]);
  const serviceDistribution = useMemo(() => groupCount(services, (s) => safeText(s.commercial_status, s.status)), [services]);

  const openDrilldown = (type, item = null) => {
    let title = "Fleet operativa", subtitle = "Device inclusi nella selezione corrente", rows = filtered;
    if (type === "offline") { title = "Device offline"; subtitle = "CPE non raggiungibili o non aggiornati"; rows = filtered.filter((d) => !d.online); }
    if (type === "critical") { title = "Critical health"; subtitle = "Health score inferiore a 65"; rows = filtered.filter((d) => safeNumber(d.diagnostics?.health_score, 100) < 65); }
    if (type === "firmware") { title = "Firmware da verificare"; subtitle = "Device non conformi al catalogo stable"; rows = filtered.filter((d) => { const expected = latestFirmwareByModel.get(`${safeText(d.manufacturer)}|${safeText(d.model)}`); return !expected || !safeText(d.software_version, "").includes(expected); }); }
    if (type === "health-item") { title = `Health · ${item.label}`; subtitle = "Distribuzione fleet health"; rows = filtered.filter((d) => healthBucket(d.diagnostics?.health_score) === item.label); }
    if (type === "firmware-item") { title = `Firmware · ${item.label}`; subtitle = "Device con la versione selezionata"; rows = filtered.filter((d) => safeText(d.software_version, "Senza versione") === item.label); }
    if (type === "vendor-item") { title = `Vendor · ${item.label}`; subtitle = "Fleet del vendor selezionato"; rows = filtered.filter((d) => safeText(d.manufacturer) === item.label); }
    if (type === "priority-critical") { title = "Priorità Critical"; subtitle = "Device offline, health critico o risorse oltre soglia"; rows = filtered.filter((d) => !d.online || safeNumber(d.diagnostics?.health_score, 100) < 65 || safeNumber(d.diagnostics?.cpu_usage_percent, 0) >= 85 || safeNumber(d.diagnostics?.memory_used_percent, 0) >= 85); }
    if (type === "priority-warning") { title = "Priorità Warning"; subtitle = "Device da monitorare"; rows = filtered.filter((d) => d.online && safeNumber(d.diagnostics?.health_score, 100) >= 65 && (safeNumber(d.diagnostics?.health_score, 100) < 85 || safeNumber(d.diagnostics?.cpu_usage_percent, 0) >= 70 || safeNumber(d.diagnostics?.memory_used_percent, 0) >= 70)); }
    if (type === "priority-healthy") { title = "Fleet Healthy"; subtitle = "Device senza anomalie rilevanti"; rows = filtered.filter((d) => d.online && safeNumber(d.diagnostics?.health_score, 0) >= 85 && safeNumber(d.diagnostics?.cpu_usage_percent, 0) < 70 && safeNumber(d.diagnostics?.memory_used_percent, 0) < 70); }
    if (type === "resources") { title = "CPU / RAM da verificare"; subtitle = "Utilizzo risorse superiore al 70%"; rows = filtered.filter((d) => safeNumber(d.diagnostics?.cpu_usage_percent, 0) >= 70 || safeNumber(d.diagnostics?.memory_used_percent, 0) >= 70); }
    if (type === "device") { title = safeText(item.customer_name, safeText(item.device_code)); subtitle = "Insight operativo"; rows = [item]; }
    if (type === "services") { title = "Servizi customer"; subtitle = `${services.length} servizi censiti`; rows = []; }
    setDrawer({ title, subtitle, rows });
  };

  return <>
    <WorkspaceLayout header={<WorkspaceHeader iconDomain="ANALYTICS" breadcrumbs={["Intelligence", "Analytics"]} eyebrow="OPERATIONAL INTELLIGENCE" title="Analytics Center" subtitle="Vista direzionale su fleet, assurance, firmware e customer operations." status={`${kpi.online}/${kpi.operational} online`} metadata={[{label:"Fleet",value:kpi.operational},{label:"Health",value:kpi.averageHealth ?? "—"},{label:"Firmware job",value:jobs.length},{label:"Servizi",value:services.length}]} actions={<WorkspaceToolbar><PrimaryActionButton startIcon={<ProximityActionIcon name="REFRESH" />} onClick={loadAll} disabled={loading}>Aggiorna analytics</PrimaryActionButton></WorkspaceToolbar>} />}>
      <Box sx={{ maxWidth: 1560, mx: "auto", width: "100%" }}>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 99 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <WorkspaceSection eyebrow="Executive view" title="Network intelligence" description="Indicatori aggregati e drill-down operativo sui dispositivi realmente gestiti; DiscoveryService e probe sono esclusi dalle metriche di fleet." sx={{ mb: 3 }}><AnalyticsKpiCards kpi={kpi} onOpen={openDrilldown} /></WorkspaceSection>
        <AnalyticsFilters query={query} onQueryChange={setQuery} vendor={vendor} onVendorChange={setVendor} model={model} onModelChange={setModel} vendors={vendors} models={models} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2,1fr)" }, gap: 2, mb: 3 }}>
          <AnalyticsDistributionCard title="Fleet health" subtitle="Distribuzione health score dei CPE monitorati" items={health} total={filtered.length} onSelect={(item) => openDrilldown("health-item", item)} />
          <AnalyticsDistributionCard title="Firmware intelligence" subtitle="Versioni firmware attualmente rilevate" items={firmware} total={filtered.length} onSelect={(item) => openDrilldown("firmware-item", item)} />
          <AnalyticsDistributionCard title="Vendor distribution" subtitle="Composizione della fleet operativa" items={vendorDistribution} total={filtered.length} onSelect={(item) => openDrilldown("vendor-item", item)} />
          <AnalyticsDistributionCard title="Customer services" subtitle="Stato commerciale dei servizi censiti" items={serviceDistribution} total={services.length} />
        </Box>
        <WorkspaceSection eyebrow="NOC COMMAND BOARD" title="Priorità operative" description="Una vista immediata su criticità, warning e azioni da eseguire sulla fleet." sx={{ mb: 2 }}><AnalyticsInsights devices={filtered} outdatedCount={kpi.outdated} onOpen={(device) => openDrilldown("device", device)} onOpenGroup={(group) => openDrilldown(group === "critical" ? "priority-critical" : group === "warning" ? "priority-warning" : group === "healthy" ? "priority-healthy" : group, null)} /></WorkspaceSection>
      </Box>
    </WorkspaceLayout>
    <AnalyticsDrawer open={Boolean(drawer)} title={drawer?.title || ""} subtitle={drawer?.subtitle || ""} rows={drawer?.rows || []} loading={false} onClose={() => setDrawer(null)} />
  </>;
}
