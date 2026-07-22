export const proximityTokens = {
  layout: {
    pageMaxWidth: 1920,
    pagePadding: { xs: 2, md: 3 },
    sectionGap: 2,
    drawerWidth: 460,
    toolbarMinHeight: 56,
  },
  shape: {
    radiusSm: 8,
    radiusMd: 12,
    radiusLg: 16,
  },
  border: {
    default: '1px solid',
    color: 'divider',
  },
  shadow: {
    panel: '0 10px 30px rgba(15, 23, 42, 0.06)',
    drawer: '0 18px 50px rgba(15, 23, 42, 0.18)',
  },
  colors: {
    primarySoft: '#EAF2FF',
    successSoft: '#E9F8EF',
    warningSoft: '#FFF6E5',
    errorSoft: '#FDECEC',
    infoSoft: '#EAF7FB',
    neutralSoft: '#F4F6F8',
  },
  status: {
    SUCCESS: { label: 'Completata', color: 'success' },
    COMPLETED: { label: 'Completata', color: 'success' },
    RUNNING: { label: 'In esecuzione', color: 'info' },
    ACTIVE: { label: 'Attiva', color: 'success' },
    PENDING: { label: 'In attesa', color: 'warning' },
    DRAFT: { label: 'Bozza', color: 'default' },
    FAILED: { label: 'Fallita', color: 'error' },
    ERROR: { label: 'Errore', color: 'error' },
    DISABLED: { label: 'Disabilitata', color: 'default' },
  },
}

export default proximityTokens
