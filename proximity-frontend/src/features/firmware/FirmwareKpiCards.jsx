import React from "react";
import { KpiCard, KpiGrid } from "../../components/proximity";
import { getProximityIconConfig } from "../../components/icons/proximityIconRegistry";

const FirmwareIcon = getProximityIconConfig("FIRMWARE").icon;
const DevicesIcon = getProximityIconConfig("ROUTER").icon;
const UpgradeIcon = getProximityIconConfig("WORKFLOW").icon;
const FailureIcon = getProximityIconConfig("DIAGNOSTICS").icon;

export default function FirmwareKpiCards({ kpi }) {
  return (
    <KpiGrid>
      <KpiCard label="Repository" value={kpi.firmware} helper="Versioni disponibili" icon={FirmwareIcon} tone="info" />
      <KpiCard label="Target CPE" value={kpi.devices} helper="Dispositivi inventariati" icon={DevicesIcon} tone="primary" />
      <KpiCard label="Job" value={kpi.jobs} helper={`${kpi.running} in corso`} icon={UpgradeIcon} tone="neutral" />
      <KpiCard label="Falliti" value={kpi.failed} helper="Richiedono verifica" icon={FailureIcon} tone={kpi.failed ? "error" : "success"} />
    </KpiGrid>
  );
}
