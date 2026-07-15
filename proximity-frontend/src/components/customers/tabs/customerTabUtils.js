export const muted = "#64748b";

export const safe = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

export const dateText = (value) => {
  if (!value) return "N/D";
  try {
    return new Date(value).toLocaleString("it-IT");
  } catch {
    return String(value);
  }
};
