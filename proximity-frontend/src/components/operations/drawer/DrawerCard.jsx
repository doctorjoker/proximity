import {
  Paper,
} from "@mui/material";

export default function DrawerCard({
  children,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 3,
        border: "1px solid #e5e7eb",
      }}
    >
      {children}
    </Paper>
  );
}
