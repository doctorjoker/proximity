import { Card } from "@mui/material";

export default function SurfaceCard({ children, sx = {}, ...props }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid rgba(148,163,184,.24)",
        borderRadius: 3,
        bgcolor: "#fff",
        boxShadow: "0 12px 32px rgba(15,23,42,.05)",
        overflow: "hidden",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
}
