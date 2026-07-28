import { KpiCard, KpiGrid } from "../../components/proximity";
import { getProximityIconConfig } from "../../components/icons/proximityIconRegistry";
import { formatPercent } from "./analyticsUtils";

const DevicesIcon = getProximityIconConfig("ROUTER").icon;
const HealthIcon = getProximityIconConfig("DIAGNOSTICS").icon;
const FirmwareIcon = getProximityIconConfig("FIRMWARE").icon;
const WorkflowIcon = getProximityIconConfig("WORKFLOW").icon;

export default function AnalyticsKpiCards({ kpi, onOpen }) {
  return <KpiGrid>
    <KpiCard label="Fleet operativa" value={kpi.operational} helper={`${kpi.online} online`} icon={DevicesIcon} tone="primary" onClick={() => onOpen("fleet")} />
    <KpiCard label="Disponibilità" value={formatPercent(kpi.onlineRate)} helper={`${kpi.offline} offline`} icon={DevicesIcon} tone={kpi.offline ? "warning" : "success"} onClick={() => onOpen("offline")} />
    <KpiCard label="Fleet health" value={kpi.averageHealth ?? "—"} helper={`${kpi.critical} critical`} icon={HealthIcon} tone={kpi.critical ? "warning" : "success"} onClick={() => onOpen("critical")} />
    <KpiCard label="Firmware compliance" value={formatPercent(kpi.firmwareCompliance)} helper={`${kpi.outdated} da verificare`} icon={FirmwareIcon} tone={kpi.outdated ? "info" : "success"} onClick={() => onOpen("firmware")} />
    <KpiCard label="Servizi attivi" value={kpi.activeServices} helper={`${kpi.suspendedServices} sospesi`} icon={WorkflowIcon} tone={kpi.suspendedServices ? "warning" : "neutral"} onClick={() => onOpen("services")} />
  </KpiGrid>;
}
