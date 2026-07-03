import { Box } from "@mui/material";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";

export default function AppLayout({ children }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <TopBar />

      <Box sx={{ display: "flex" }}>
        <Sidebar />

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: "calc(100vh - 112px)",
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>

      <StatusBar />
    </Box>
  );
}
