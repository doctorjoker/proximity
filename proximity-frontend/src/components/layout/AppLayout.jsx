import { createContext, useContext } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";

const AppShellContext = createContext(false);

export default function AppLayout({ children }) {
  const alreadyInsideShell = useContext(AppShellContext);
  const content = children ?? <Outlet />;

  // Compatibility guard: legacy pages that still mount <AppLayout> do not
  // create a second Sidebar/TopBar when rendered inside the routed shell.
  if (alreadyInsideShell) return content;

  return (
    <AppShellContext.Provider value>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
        <TopBar />

        <Box sx={{ display: "flex", minWidth: 0 }}>
          <Sidebar />

          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: "calc(100vh - 112px)",
              p: { xs: 2, md: 3 },
              overflowX: "hidden",
            }}
          >
            {content}
          </Box>
        </Box>

        <StatusBar />
      </Box>
    </AppShellContext.Provider>
  );
}
