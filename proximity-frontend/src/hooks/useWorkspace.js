import { useCallback, useMemo, useState } from "react";

export default function useWorkspace({ initialSearch = "", initialPage = 0, initialRowsPerPage = 25 } = {}) {
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerEntity, setDrawerEntity] = useState(null);
  const [filters, setFilters] = useState({});

  const updateSearch = useCallback((value) => {
    setSearch(value);
    setPage(0);
  }, []);

  const updateFilters = useCallback((nextFilters) => {
    setFilters(nextFilters || {});
    setPage(0);
  }, []);

  const reset = useCallback(() => {
    setSearch(initialSearch);
    setPage(initialPage);
    setRowsPerPage(initialRowsPerPage);
    setSelectedIds([]);
    setDrawerEntity(null);
    setFilters({});
  }, [initialPage, initialRowsPerPage, initialSearch]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)).length,
    [filters],
  );

  return {
    search,
    setSearch: updateSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    selectedIds,
    setSelectedIds,
    drawerEntity,
    openDrawer: setDrawerEntity,
    closeDrawer: () => setDrawerEntity(null),
    filters,
    setFilters: updateFilters,
    activeFilterCount,
    reset,
  };
}
