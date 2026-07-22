export function procedureCode(procedure) {
  return procedure?.code || procedure?.definition_code || procedure?.procedure_code || "";
}

export function isActiveStatus(status) {
  return status === "ACTIVE" || status === "PUBLISHED" || status === "Attiva";
}

export function isDraftStatus(status) {
  return status === "DRAFT" || status === "Bozza";
}

export function isDeprecatedStatus(status) {
  return status === "DEPRECATED" || status === "HISTORICAL" || status === "Storica";
}

export function operatorName(code, fallback) {
  const names = {
    FIRST_SERVICE_PROVISIONING: "Prima attivazione servizio",
    ROUTER_REPLACEMENT: "Sostituzione router",
    DEVICE_REBOOT: "Riavvio router",
    "PROC-ROUTER-REPLACEMENT": "Sostituzione router cliente",
  };

  return names[code] || fallback || code;
}

export function operatorDescription(procedure) {
  const descriptions = {
    FIRST_SERVICE_PROVISIONING: "Provisioning iniziale di un nuovo servizio cliente.",
    ROUTER_REPLACEMENT: "Procedura per sostituzione router e riallineamento configurazione.",
    DEVICE_REBOOT: "Riavvio remoto controllato del router cliente.",
    "PROC-ROUTER-REPLACEMENT":
      "Procedura automatica per sostituzione router cliente con provisioning ACS e verifica runtime.",
  };

  return descriptions[procedureCode(procedure)] || procedure?.description || "Nessuna descrizione disponibile.";
}

export function getVersions(procedure, versionsByCode) {
  return versionsByCode[procedureCode(procedure)] || [];
}

export function getActiveVersion(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).find((version) => isActiveStatus(version.status));
}

export function getDraftVersion(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).find((version) => isDraftStatus(version.status));
}

export function getDeprecatedVersions(procedure, versionsByCode) {
  return getVersions(procedure, versionsByCode).filter((version) => isDeprecatedStatus(version.status));
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
