import React, { useEffect, useMemo, useState } from "react";
import { Box, LinearProgress } from "@mui/material";

import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceToolbar,
  KpiCard,
  KpiGrid,
  PrimaryActionButton,
  SecondaryActionButton,
  TertiaryActionButton,
  WorkspaceCard,
  WorkspaceSection,
} from "../components/proximity";
import ProximityActionIcon from "../components/icons/ProximityActionIcon";
import { getProximityIconConfig } from "../components/icons/proximityIconRegistry";

import CustomerFilters from "../components/customers/CustomerFilters";
import CustomerTable from "../components/customers/CustomerTable";
import CustomerCreateDialog from "../components/customers/CustomerCreateDialog";
import Customer360Drawer from "../components/customers/Customer360Drawer";

const CustomerIcon = getProximityIconConfig("CUSTOMER").icon;
const LinkedIcon = getProximityIconConfig("NETWORKING").icon;
const RouterIcon = getProximityIconConfig("ROUTER").icon;
const UnlinkedIcon = getProximityIconConfig("DIAGNOSTICS").icon;
const RefreshIcon = getProximityIconConfig("DEVICE_REBOOT").icon;

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
    <>
      <WorkspaceLayout
        header={
          <WorkspaceHeader
            iconDomain="CUSTOMER"
            breadcrumbs={["Operations", "Customers"]}
            eyebrow="CUSTOMER MANAGEMENT"
            title="Customers Workspace"
            subtitle="Gestione clienti, associazioni PPPoE, servizi e Customer 360."
            status={`${summary.linked}/${summary.total} collegati`}
            metadata={[
              { label: "Clienti", value: summary.total },
              { label: "Collegati", value: summary.linked },
              { label: "Router", value: summary.devices },
              { label: "Senza CPE", value: summary.unlinked },
            ]}
            actions={
              <WorkspaceToolbar>
                <PrimaryActionButton
                  startIcon={<ProximityActionIcon name="ADD" />}
                  onClick={() => setNewCustomerOpen(true)}
                >
                  Nuovo cliente
                </PrimaryActionButton>
                <SecondaryActionButton
                  startIcon={<RefreshIcon size={18} stroke={1.9} />}
                  onClick={loadCustomers}
                  loading={loading}
                >
                  Aggiorna
                </SecondaryActionButton>
              </WorkspaceToolbar>
            }
          />
        }
      >
        <Box sx={{ maxWidth: 1560, mx: "auto", width: "100%" }}>
          <WorkspaceSection
            eyebrow="Operations"
            title="Customer management"
            description="Anagrafiche, associazioni CPE e copertura operativa del portafoglio clienti."
            sx={{ mb: 3 }}
          >
            <KpiGrid>
              <KpiCard
                label="Clienti"
                value={summary.total}
                helper="Anagrafiche caricate"
                icon={CustomerIcon}
                tone="primary"
                action={
                  <TertiaryActionButton size="compact" onClick={() => setStatusFilter("ALL")}>
                    Apri elenco
                  </TertiaryActionButton>
                }
              />
              <KpiCard
                label="Collegati"
                value={summary.linked}
                helper="Matching PPPoE/CPE"
                icon={LinkedIcon}
                tone="success"
                action={
                  <TertiaryActionButton size="compact" onClick={() => setStatusFilter("LINKED")}>
                    Filtra collegati
                  </TertiaryActionButton>
                }
              />
              <KpiCard
                label="Router"
                value={summary.devices}
                helper="Apparati associati"
                icon={RouterIcon}
                tone="warning"
              />
              <KpiCard
                label="Senza CPE"
                value={summary.unlinked}
                helper="Clienti da associare"
                icon={UnlinkedIcon}
                tone={summary.unlinked > 0 ? "error" : "neutral"}
                action={
                  <TertiaryActionButton size="compact" onClick={() => setStatusFilter("UNLINKED")}>
                    Filtra criticità
                  </TertiaryActionButton>
                }
              />
            </KpiGrid>
          </WorkspaceSection>

          <CustomerFilters
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
            <WorkspaceCard sx={{ mb: 2, borderColor: "#fecaca", bgcolor: "#fff7f7" }} contentSx={{ p: 0 }}>
              <Box sx={{ p: 2, color: "#b91c1c", fontWeight: 800 }}>{error}</Box>
            </WorkspaceCard>
          ) : null}

          {loading ? <LinearProgress sx={{ mb: 1.5, borderRadius: 2 }} /> : null}

          <WorkspaceCard sx={{ overflow: "hidden" }} contentSx={{ p: 0 }}>
            <CustomerTable
              customers={visibleCustomers}
              loading={loading}
              onOpenCustomer={openCustomer}
            />
          </WorkspaceCard>
        </Box>
      </WorkspaceLayout>

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
    </>
  );
}
