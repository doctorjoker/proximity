import React from "react";
import { Button, Stack } from "@mui/material";
import { Groups, Person } from "@mui/icons-material";
import PageHeader from "../ui/PageHeader";

export default function CustomerHeader({ onCreate }) {
  return (
    <PageHeader
      icon={<Groups />}
      eyebrow="Operations"
      title="Customers"
      subtitle="Gestione clienti, associazioni PPPoE, servizi e Customer 360."
      actions={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            startIcon={<Person />}
            onClick={onCreate}
            sx={{ textTransform: "none", fontWeight: 900, px: 2.2, minHeight: 40 }}
          >
            Nuovo cliente
          </Button>
        </Stack>
      )}
    />
  );
}
