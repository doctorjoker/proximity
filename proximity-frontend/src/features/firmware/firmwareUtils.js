export const emptyFirmwareForm = {
  vendor: "TP-Link",
  model: "XC220-G3v",
  version: "",
  filename: "",
  stable: true,
  mandatory: false,
  notes: "",
};

export const safeText = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    if (value._value !== undefined && value._value !== null) return String(value._value);
    return fallback;
  }
  return String(value);
};

export const formatDate = (value) => {
  if (!value) return "N/D";
  try {
    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

export const formatFileSize = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "N/D";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};
