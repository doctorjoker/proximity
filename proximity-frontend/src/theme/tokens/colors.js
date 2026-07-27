/**
 * Proximity visual palette.
 * Source of truth: current Dashboard visual language.
 */
export const proximityColors = Object.freeze({
  canvas: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#2563EB',
  primarySoft: 'rgba(37, 99, 235, 0.10)',
  tones: Object.freeze({
    primary: Object.freeze({ main: '#2563EB', soft: 'rgba(37,99,235,0.10)' }),
    success: Object.freeze({ main: '#16A34A', soft: 'rgba(22,163,74,0.10)' }),
    warning: Object.freeze({ main: '#D97706', soft: 'rgba(217,119,6,0.11)' }),
    error: Object.freeze({ main: '#DC2626', soft: 'rgba(220,38,38,0.10)' }),
    cyan: Object.freeze({ main: '#0891B2', soft: 'rgba(8,145,178,0.10)' }),
    neutral: Object.freeze({ main: '#64748B', soft: 'rgba(100,116,139,0.10)' }),
  }),
  status: Object.freeze({
    success: Object.freeze({ color: '#15803D', background: '#DCFCE7', border: '#BBF7D0' }),
    warning: Object.freeze({ color: '#B45309', background: '#FEF3C7', border: '#FDE68A' }),
    error: Object.freeze({ color: '#B91C1C', background: '#FEE2E2', border: '#FECACA' }),
    info: Object.freeze({ color: '#1D4ED8', background: '#DBEAFE', border: '#BFDBFE' }),
    neutral: Object.freeze({ color: '#475569', background: '#F1F5F9', border: '#E2E8F0' }),
  }),
  domains: Object.freeze({
    Internet: Object.freeze({ color: '#2563EB', soft: 'rgba(37, 99, 235, 0.10)' }),
    WiFi: Object.freeze({ color: '#0D9488', soft: 'rgba(13, 148, 136, 0.10)' }),
    Voice: Object.freeze({ color: '#7C3AED', soft: 'rgba(124, 58, 237, 0.10)' }),
    Management: Object.freeze({ color: '#D97706', soft: 'rgba(217, 119, 6, 0.10)' }),
    Security: Object.freeze({ color: '#DC2626', soft: 'rgba(220, 38, 38, 0.10)' }),
    Other: Object.freeze({ color: '#64748B', soft: 'rgba(100, 116, 139, 0.10)' }),
  }),
})
