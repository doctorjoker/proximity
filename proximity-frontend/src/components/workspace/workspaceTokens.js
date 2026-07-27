import { proximityDesignTokens } from '../../theme'

/**
 * Backward-compatible Workspace token facade.
 * The Dashboard-derived theme in src/theme is the only visual source of truth.
 */
export const workspaceTokens = Object.freeze({
  shell: Object.freeze({
    background: proximityDesignTokens.colors.canvas,
    surface: proximityDesignTokens.colors.surface,
    surfaceMuted: proximityDesignTokens.colors.surfaceMuted,
    border: proximityDesignTokens.colors.border,
    borderStrong: proximityDesignTokens.colors.borderStrong,
    text: proximityDesignTokens.colors.text,
    textMuted: proximityDesignTokens.colors.textMuted,
    primary: proximityDesignTokens.colors.primary,
    primarySoft: proximityDesignTokens.colors.primarySoft,
  }),
  radius: proximityDesignTokens.radius,
  shadow: proximityDesignTokens.shadows,
  status: proximityDesignTokens.colors.status,
  domains: proximityDesignTokens.colors.domains,
  spacing: proximityDesignTokens.spacing,
  typography: proximityDesignTokens.typography,
  transitions: proximityDesignTokens.transitions,
  navigation: Object.freeze({ width: 340, rowHeight: 42, indent: 18, groupRadius: 10, searchHeight: 40 }),
})

export function getWorkspaceDomainToken(domain) {
  return workspaceTokens.domains?.[domain] || workspaceTokens.domains?.Other || {
    color: workspaceTokens.shell.textMuted,
    soft: workspaceTokens.shell.surfaceMuted,
  }
}
