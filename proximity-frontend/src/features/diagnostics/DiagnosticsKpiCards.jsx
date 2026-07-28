import { KpiCard, KpiGrid } from "../../components/proximity";
import { getProximityIconConfig } from "../../components/icons/proximityIconRegistry";

const DiagnosticsIcon = getProximityIconConfig("DIAGNOSTICS").icon;
const OnlineIcon = getProximityIconConfig("ROUTER").icon;
const WarningIcon = getProximityIconConfig("WORKFLOW").icon;
const ResourceIcon = getProximityIconConfig("DEVICE_REBOOT").icon;

export default function DiagnosticsKpiCards({ kpi }) {
  const averageTone = kpi.averageHealth === null ? "neutral" : kpi.averageHealth >= 85 ? "success" : kpi.averageHealth >= 65 ? "warning" : "error";
  const resourceTone = kpi.highResources === 0 ? "success" : kpi.highResources <= 3 ? "warning" : "error";

  return (
    <KpiGrid>
      <KpiCard
        label="Inventario"
        value={kpi.total}
        helper={`${kpi.monitored} con Carrier Diagnostics`}
        icon={DiagnosticsIcon}
        tone="primary"
      />
      <KpiCard
        label="Connettività"
        value={`${kpi.online}/${kpi.total}`}
        helper={`${kpi.offline} offline`}
        icon={OnlineIcon}
        tone={kpi.offline ? "warning" : "success"}
      />
      <KpiCard
        label="Health medio"
        value={kpi.averageHealth === null ? "—" : `${kpi.averageHealth}/100`}
        helper={`${kpi.good} device in stato buono`}
        icon={DiagnosticsIcon}
        tone={averageTone}
      />
      <KpiCard
        label="Da verificare"
        value={kpi.warning + kpi.critical}
        helper={`${kpi.warning} warning · ${kpi.critical} critici`}
        icon={WarningIcon}
        tone={kpi.critical ? "error" : kpi.warning ? "warning" : "success"}
      />
      <KpiCard
        label="Risorse elevate"
        value={kpi.highResources}
        helper={kpi.highResources ? "CPU o RAM oltre l'80%" : "Nessuna criticità rilevata"}
        icon={ResourceIcon}
        tone={resourceTone}
      />
    </KpiGrid>
  );
}
