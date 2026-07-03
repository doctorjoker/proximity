import { Card, CardContent, Stack, Typography } from "@mui/material";

export default function KpiCard({
  title,
  value,
  icon,
  color = "#2563eb",
  subtitle,
}) {
  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 3,
        height: "100%",
        transition: "0.2s",
        borderTop: `4px solid ${color}`,
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack spacing={1}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color,
              }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            )}
          </Stack>

          {icon}
        </Stack>
      </CardContent>
    </Card>
  );
}
