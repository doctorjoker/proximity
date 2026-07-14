import {
  AccountTree,
  Analytics,
  Dashboard,
  Devices,
  Groups,
  MonitorHeart,
  PlayCircle,
  Settings,
  SystemUpdate,
} from "@mui/icons-material";

export const navigationSections = [
  {
    key: "main",
    label: null,
    items: [
      {
        label: "Dashboard",
        path: "/",
        icon: Dashboard,
        breadcrumb: ["Dashboard"],
        match: (pathname) => pathname === "/",
      },
    ],
  },
  {
    key: "automation",
    label: "AUTOMATION",
    items: [
      {
        label: "Procedure Automatiche",
        path: "/procedures",
        icon: AccountTree,
        breadcrumb: ["Automation", "Procedure Automatiche"],
        match: (pathname) =>
          pathname.startsWith("/procedures") &&
          !pathname.startsWith("/procedures/executions"),
      },
      {
        label: "Execution Center",
        path: "/procedure-executions",
        icon: PlayCircle,
        breadcrumb: ["Automation", "Execution Center"],
        match: (pathname) =>
          pathname.startsWith("/procedure-executions") ||
          pathname.startsWith("/procedures/executions"),
      },
    ],
  },
  {
    key: "operations",
    label: "OPERATIONS",
    items: [
      {
        label: "Customers",
        path: "/customers",
        icon: Groups,
        breadcrumb: ["Operations", "Customers"],
        match: (pathname) =>
          pathname.startsWith("/customers") ||
          pathname.startsWith("/customer-care"),
      },
      {
        label: "Devices",
        path: "/devices",
        icon: Devices,
        breadcrumb: ["Operations", "Devices"],
      },
      {
        label: "Firmware",
        path: "/firmware",
        icon: SystemUpdate,
        breadcrumb: ["Operations", "Firmware"],
      },
      {
        label: "Diagnostics",
        path: "/diagnostics",
        icon: MonitorHeart,
        breadcrumb: ["Operations", "Diagnostics"],
      },
      {
        label: "Analytics",
        path: "/analytics",
        icon: Analytics,
        breadcrumb: ["Operations", "Analytics"],
      },
    ],
  },
  {
    key: "administration",
    label: "ADMINISTRATION",
    items: [
      {
        label: "Administration",
        path: "/administration",
        icon: Settings,
        breadcrumb: ["Administration"],
        match: (pathname) =>
          pathname.startsWith("/administration") || pathname.startsWith("/settings"),
      },
    ],
  },
];

export const navigationItems = navigationSections.flatMap((section) => section.items);

export function isNavigationItemSelected(item, pathname) {
  if (typeof item.match === "function") return item.match(pathname);
  if (item.path === "/") return pathname === "/";
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function resolveNavigation(pathname) {
  const item = navigationItems.find((candidate) =>
    isNavigationItemSelected(candidate, pathname),
  );

  if (item) return item;

  if (pathname.startsWith("/workflow-operations")) {
    return {
      label: "Workflow Operations",
      breadcrumb: ["Operations", "Workflow Operations"],
    };
  }

  if (pathname.startsWith("/suspended")) {
    return {
      label: "Suspended Portal",
      breadcrumb: ["Operations", "Suspended Portal"],
    };
  }

  return {
    label: "Proximity",
    breadcrumb: ["Proximity"],
  };
}
