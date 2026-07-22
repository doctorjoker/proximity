import React, { useEffect, useMemo, useState } from "react";
import { Box, LinearProgress } from "@mui/material";

import CustomerHeader from "../components/customers/CustomerHeader";
import CustomerMetrics from "../components/customers/CustomerMetrics";
import CustomerToolbar from "../components/customers/CustomerToolbar";
import CustomerWorkspace from "../components/customers/CustomerWorkspace";
import CustomerCreateDialog from "../components/customers/CustomerCreateDialog";
import Customer360Drawer from "../components/customers/Customer360Drawer";
import SurfaceCard from "../components/ui/SurfaceCard";
import WorkspaceTemplate from "../components/ui/WorkspaceTemplate";

const API_BASE = "";

const safe = (value, fallback = "N/D") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query.trim()
        ? `${API_BASE}/api/v1/customers?limit=60&q=${encodeURIComponent(query.trim())}`
        : `${API_BASE}/api/v1/customers?limit=60`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Errore caricamento clienti");
      }
      setCustomers(data.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Errore caricamento clienti");
    } finally {
      setLoading(false);
    }
  };

  const openCustomer = async (customer) => {
    setSelected(customer);
    setSelectedDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/customers/${customer.id}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Errore dettaglio cliente");
      }
      setSelectedDetail(data);
    } catch (err) {
      console.error(err);
      setSelectedDetail({ error: err.message || "Errore Customer 360" });
    } finally {
      setDetailLoading(false);
    }
  };

  const openRouterAccess = async (deviceId) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/access-url`);
      const data = await response.json();
      if (!response.ok || !data.success || !data.access_url) {
        throw new Error(data.reason || data.detail || "Access URL non disponibile");
      }
      window.open(data.access_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      window.alert(`Errore apertura router: ${err.message}`);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const linked = customers.filter((item) => (item.devices || []).length > 0).length;
    const devices = customers.reduce((total, item) => total + (item.devices || []).length, 0);
    return {
      total: customers.length,
      linked,
      devices,
      unlinked: Math.max(customers.length - linked, 0),
    };
  }, [customers]);

  const profiles = useMemo(
    () => [...new Set(customers.map((item) => safe(item.profile, "")).filter(Boolean))].sort(),
    [customers],
  );

  const visibleCustomers = useMemo(
    () => customers.filter((customer) => {
      const linked = (customer.devices || []).length > 0;
      if (statusFilter === "LINKED" && !linked) return false;
      if (statusFilter === "UNLINKED" && linked) return false;
      if (profileFilter !== "ALL" && safe(customer.profile, "") !== profileFilter) return false;
      return true;
    }),
    [customers, statusFilter, profileFilter],
  );

  const exportCustomers = () => {
    const headers = ["customer_name", "customer_code", "contract_number", "profile", "radius_login", "city", "province", "devices"];
    const rows = visibleCustomers.map((item) => [
      item.customer_name,
      item.customer_code,
      item.contract_number,
      item.profile,
      item.radius_login,
      item.city,
      item.province,
      (item.devices || []).length,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "proximity-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorkspaceTemplate sx={{ color: "#0f172a" }}>
      <CustomerHeader onCreate={() => setNewCustomerOpen(true)} />
      <CustomerMetrics summary={summary} onFilter={setStatusFilter} />
      <CustomerToolbar
        query={query}
        onQueryChange={setQuery}
        onSearch={loadCustomers}
        onRefresh={loadCustomers}
        loading={loading}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        profile={profileFilter}
        onProfileChange={setProfileFilter}
        profiles={profiles}
        onExport={exportCustomers}
      />

      {error ? (
        <SurfaceCard sx={{ mb: 2, borderColor: "#fecaca", bgcolor: "#fff7f7" }}>
          <Box sx={{ p: 2, color: "#b91c1c", fontWeight: 800 }}>{error}</Box>
        </SurfaceCard>
      ) : null}

      {loading ? <LinearProgress sx={{ mb: 1.5, borderRadius: 2 }} /> : null}

      <CustomerWorkspace
        customers={visibleCustomers}
        loading={loading}
        onOpenCustomer={openCustomer}
      />

      <CustomerCreateDialog open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} />

      <Customer360Drawer
        open={Boolean(selected)}
        customer={selected}
        detail={selectedDetail}
        loading={detailLoading}
        onClose={() => {
          setSelected(null);
          setSelectedDetail(null);
        }}
        onOpenRouter={openRouterAccess}
      />
    </WorkspaceTemplate>
  );
}
