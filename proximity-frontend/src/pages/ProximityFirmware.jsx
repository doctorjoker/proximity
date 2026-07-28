import React, { useEffect, useMemo, useState } from "react";
import { Box, LinearProgress } from "@mui/material";
import {
  PrimaryActionButton,
  SecondaryActionButton,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
  WorkspaceTabs,
  WorkspaceToolbar,
} from "../components/proximity";
import ProximityActionIcon from "../components/icons/ProximityActionIcon";
import {
  FirmwareCampaigns,
  FirmwareDeleteDialog,
  FirmwareKpiCards,
  FirmwareRepository,
  FirmwareTargets,
  FirmwareUploadDialog,
  MassUpgradeDialog,
  emptyFirmwareForm,
} from "../features/firmware";

const API_BASE = "";

export default function ProximityFirmware() {
  const [activeView, setActiveView] = useState("repository");
  const [firmwareCatalog, setFirmwareCatalog] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [firmwareUploadOpen, setFirmwareUploadOpen] = useState(false);
  const [firmwareForm, setFirmwareForm] = useState(emptyFirmwareForm);
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [firmwareUploadLoading, setFirmwareUploadLoading] = useState(false);
  const [firmwareDeleteTarget, setFirmwareDeleteTarget] = useState(null);
  const [firmwareDeleteLoading, setFirmwareDeleteLoading] = useState(false);
  const [massUpgradeOpen, setMassUpgradeOpen] = useState(false);
  const [massFirmwareId, setMassFirmwareId] = useState("");
  const [massUpgradeLoading, setMassUpgradeLoading] = useState(false);
  const [lastMassResult, setLastMassResult] = useState(null);

  const loadFirmwareCatalog = async () => {
    const res = await fetch(`${API_BASE}/api/v1/firmware/catalog`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "Errore caricamento catalogo firmware");
    const items = data.items || [];
    setFirmwareCatalog(items);
    setMassFirmwareId((current) => current || items[0]?.id || "");
  };
  const loadFirmwareJobs = async () => {
    const res = await fetch(`${API_BASE}/api/v1/firmware/jobs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "Errore caricamento job firmware");
    setJobs(data.items || []);
  };
  const loadDevices = async () => {
    const res = await fetch(`${API_BASE}/api/v1/devices`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "Errore caricamento dispositivi");
    setDevices(data.items || []);
  };
  const loadAll = async () => {
    setPageLoading(true);
    try { await Promise.all([loadFirmwareCatalog(), loadFirmwareJobs(), loadDevices()]); }
    catch (err) { console.error(err); alert(err.message); }
    finally { setPageLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const kpi = useMemo(() => {
    const failed = jobs.filter((job) => job.status === "FAILED").length;
    const running = jobs.filter((job) => !["FAILED", "COMPLETED", "SUCCESS"].includes(job.status)).length;
    return { firmware: firmwareCatalog.length, devices: devices.length, jobs: jobs.length, running, failed };
  }, [firmwareCatalog, devices, jobs]);

  const createFirmware = async () => {
    if (!firmwareForm.vendor || !firmwareForm.model || !firmwareForm.version) return alert("Compila vendor, modello e versione.");
    if (!firmwareFile) return alert("Seleziona un file firmware.");
    try {
      setFirmwareUploadLoading(true);
      const formData = new FormData();
      formData.append("vendor", firmwareForm.vendor); formData.append("model", firmwareForm.model); formData.append("version", firmwareForm.version);
      formData.append("stable", String(Boolean(firmwareForm.stable))); formData.append("mandatory", String(Boolean(firmwareForm.mandatory)));
      formData.append("notes", firmwareForm.notes || ""); formData.append("file", firmwareFile);
      const res = await fetch(`${API_BASE}/api/v1/firmware/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore upload firmware");
      setFirmwareUploadOpen(false); setFirmwareForm(emptyFirmwareForm); setFirmwareFile(null); await loadFirmwareCatalog(); alert(`Firmware caricato: ${data.filename}`);
    } catch (err) { console.error(err); alert(`Errore firmware: ${err.message}`); }
    finally { setFirmwareUploadLoading(false); }
  };

  const deleteFirmware = async () => {
    if (!firmwareDeleteTarget?.id) return;
    try {
      setFirmwareDeleteLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/firmware/catalog/${firmwareDeleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore eliminazione firmware");
      setFirmwareDeleteTarget(null); await loadFirmwareCatalog();
    } catch (err) { console.error(err); alert(`Errore eliminazione firmware: ${err.message}`); }
    finally { setFirmwareDeleteLoading(false); }
  };

  const toggleDevice = (deviceId) => setSelectedDeviceIds((current) => current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]);
  const runMassUpgrade = async () => {
    if (!massFirmwareId) return alert("Seleziona un firmware");
    if (!selectedDeviceIds.length) return alert("Seleziona almeno un dispositivo");
    try {
      setMassUpgradeLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/firmware/campaigns/mass-upgrade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firmware_id: massFirmwareId, device_ids: selectedDeviceIds, created_by: "BACKOFFICE_UI" }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.detail || "Errore upgrade massivo");
      setLastMassResult(data); await loadFirmwareJobs();
    } catch (err) { console.error(err); alert(`Errore upgrade massivo: ${err.message}`); }
    finally { setMassUpgradeLoading(false); }
  };

  return <>
    <WorkspaceLayout
      header={<WorkspaceHeader iconDomain="FIRMWARE" breadcrumbs={["Operations", "Firmware"]} eyebrow="FIRMWARE OPERATIONS" title="Firmware Workspace" subtitle="Repository, campagne di rollout e job di upgrade per i dispositivi Proximity." status={`${kpi.firmware} versioni`} metadata={[{ label: "Firmware", value: kpi.firmware }, { label: "Device", value: kpi.devices }, { label: "Job", value: kpi.jobs }, { label: "Falliti", value: kpi.failed }]} actions={<WorkspaceToolbar><PrimaryActionButton startIcon={<ProximityActionIcon name="REFRESH" />} onClick={loadAll}>Aggiorna</PrimaryActionButton><SecondaryActionButton startIcon={<ProximityActionIcon name="PUBLISH" />} onClick={() => setFirmwareUploadOpen(true)}>Carica firmware</SecondaryActionButton><SecondaryActionButton startIcon={<ProximityActionIcon name="ADD" />} onClick={() => setMassUpgradeOpen(true)}>Nuova campagna</SecondaryActionButton></WorkspaceToolbar>} />}
      tabs={<WorkspaceTabs value={activeView} onChange={setActiveView} items={[{ value: "repository", label: "Repository", status: kpi.firmware }, { value: "campaigns", label: "Campaigns", status: kpi.jobs }, { value: "targets", label: "Targets", status: selectedDeviceIds.length }]} />}
    >
      <Box sx={{ maxWidth: 1560, mx: "auto", width: "100%" }}>
        {pageLoading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
        <WorkspaceSection eyebrow="Operations" title="Firmware control center" description="Visibilità centralizzata su catalogo, target CPE, campagne e risultati di deployment." sx={{ mb: 3 }}><FirmwareKpiCards kpi={kpi} /></WorkspaceSection>
        {activeView === "repository" && <FirmwareRepository firmwareCatalog={firmwareCatalog} pageLoading={pageLoading} onUpload={() => setFirmwareUploadOpen(true)} onDeploy={(fw) => { setMassFirmwareId(fw.id); setMassUpgradeOpen(true); }} onDelete={setFirmwareDeleteTarget} />}
        {activeView === "campaigns" && <FirmwareCampaigns jobs={jobs} onNewCampaign={() => setMassUpgradeOpen(true)} />}
        {activeView === "targets" && <FirmwareTargets devices={devices} selectedDeviceIds={selectedDeviceIds} onToggleDevice={toggleDevice} onContinue={() => setMassUpgradeOpen(true)} />}
      </Box>
    </WorkspaceLayout>
    <FirmwareUploadDialog open={firmwareUploadOpen} form={firmwareForm} file={firmwareFile} loading={firmwareUploadLoading} onClose={() => setFirmwareUploadOpen(false)} onFormChange={setFirmwareForm} onFileChange={setFirmwareFile} onSubmit={createFirmware} />
    <FirmwareDeleteDialog target={firmwareDeleteTarget} loading={firmwareDeleteLoading} onClose={() => setFirmwareDeleteTarget(null)} onConfirm={deleteFirmware} />
    <MassUpgradeDialog open={massUpgradeOpen} firmwareCatalog={firmwareCatalog} firmwareId={massFirmwareId} selectedCount={selectedDeviceIds.length} loading={massUpgradeLoading} result={lastMassResult} onClose={() => setMassUpgradeOpen(false)} onFirmwareChange={setMassFirmwareId} onRun={runMassUpgrade} />
  </>;
}
