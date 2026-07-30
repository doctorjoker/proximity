import React from "react";
import { Tab, Tabs } from "@mui/material";

const items = [
  { value: "overview", label: "Overview" },
  { value: "acs", label: "ACS" },
  { value: "wifi", label: "WiFi", disabled: true },
  { value: "health", label: "Health" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "firmware", label: "Firmware", disabled: true },
  { value: "procedures", label: "Procedures", disabled: true },
  { value: "history", label: "History", /* EUREKA28.1.1b_HISTORY_TAB */ },
  { value: "ai", label: "AI", disabled: true },
];

export default function Device360Tabs({ value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        px: 2,
        minHeight: 52,
        borderBottom: "1px solid rgba(15,23,42,.08)",
        background: "rgba(255,255,255,.96)",
        "& .MuiTab-root": {
          minHeight: 52,
          fontWeight: 900,
          textTransform: "none",
        },
      }}
    >
      {items.map((item) => (
        <Tab key={item.value} value={item.value} label={item.label} disabled={item.disabled} />
      ))}
    </Tabs>
  );
}
