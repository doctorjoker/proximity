import { useMemo } from "react";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryIcon from "@mui/icons-material/History";

import { KpiCard, KpiGrid } from "../proximity";
import {
  getActiveVersion,
  getDeprecatedVersions,
  getDraftVersion,
} from "./catalogUtils";

export default function ProcedureMetrics({ procedures, versionsByCode }) {
  const stats = useMemo(() => {
    const activeCount = procedures.filter((procedure) =>
      Boolean(getActiveVersion(procedure, versionsByCode)),
    ).length;
    const draftCount = procedures.filter((procedure) =>
      Boolean(getDraftVersion(procedure, versionsByCode)),
    ).length;
    const historicalCount = procedures.filter(
      (procedure) =>
        getDeprecatedVersions(procedure, versionsByCode).length > 0,
    ).length;

    return [
      {
        label: "Procedure",
        value: procedures.length,
        helper: "Modelli presenti nel catalogo",
        icon: ArticleOutlinedIcon,
        tone: "primary",
      },
      {
        label: "Procedure attive",
        value: activeCount,
        helper: "Versioni pubblicate e operative",
        icon: CheckCircleIcon,
        tone: "success",
      },
      {
        label: "Con bozza",
        value: draftCount,
        helper: "Modifiche ancora da pubblicare",
        icon: EditNoteIcon,
        tone: "warning",
      },
      {
        label: "Storiche",
        value: historicalCount,
        helper: "Procedure con versioni archiviate",
        icon: HistoryIcon,
        tone: "cyan",
      },
    ];
  }, [procedures, versionsByCode]);

  return (
    <KpiGrid>
      {stats.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </KpiGrid>
  );
}
