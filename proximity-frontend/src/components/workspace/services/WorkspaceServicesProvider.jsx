import { createContext, useCallback, useMemo, useReducer } from 'react'

const initialState = {
  currentWorkspace: null,
  selectedItem: null,
  dirty: false,
  validation: null,
  notifications: [],
  activities: [],
  recentItems: [],
  favorites: [],
  commands: [],
  commandPaletteOpen: false,
  notificationCenterOpen: false,
}

export const WorkspaceServicesContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.payload ? { ...item, read: true } : item,
        ),
      }
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] }
    case 'ADD_ACTIVITY':
      return {
        ...state,
        activities: [action.payload, ...state.activities],
      }
    case 'REGISTER_COMMANDS': {
      const incoming = Array.isArray(action.payload) ? action.payload : []
      const byId = new Map(state.commands.map((command) => [command.id, command]))
      incoming.forEach((command) => byId.set(command.id, command))
      return { ...state, commands: Array.from(byId.values()) }
    }
    case 'UNREGISTER_COMMANDS': {
      const ids = new Set(Array.isArray(action.payload) ? action.payload : [])
      return { ...state, commands: state.commands.filter((command) => !ids.has(command.id)) }
    }
    default:
      return state
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function WorkspaceServicesProvider({ children, initialValue = {} }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...initialValue })

  const patch = useCallback((payload) => dispatch({ type: 'PATCH', payload }), [])
  const setCurrentWorkspace = useCallback((currentWorkspace) => patch({ currentWorkspace }), [patch])
  const setSelectedItem = useCallback((selectedItem) => patch({ selectedItem }), [patch])
  const setDirty = useCallback((dirty) => patch({ dirty: Boolean(dirty) }), [patch])
  const setValidation = useCallback((validation) => patch({ validation }), [patch])
  const openCommandPalette = useCallback(() => patch({ commandPaletteOpen: true }), [patch])
  const closeCommandPalette = useCallback(() => patch({ commandPaletteOpen: false }), [patch])
  const openNotificationCenter = useCallback(() => patch({ notificationCenterOpen: true }), [patch])
  const closeNotificationCenter = useCallback(() => patch({ notificationCenterOpen: false }), [patch])

  const notify = useCallback((notification) => {
    const item = {
      id: notification?.id || createId('notification'),
      title: notification?.title || 'Notifica',
      message: notification?.message || '',
      severity: notification?.severity || 'info',
      read: Boolean(notification?.read),
      createdAt: notification?.createdAt || new Date().toISOString(),
      ...notification,
    }
    dispatch({ type: 'ADD_NOTIFICATION', payload: item })
    return item.id
  }, [])

  const addActivity = useCallback((activity) => {
    const item = {
      id: activity?.id || createId('activity'),
      title: activity?.title || 'Attività',
      description: activity?.description || '',
      status: activity?.status || 'info',
      createdAt: activity?.createdAt || new Date().toISOString(),
      ...activity,
    }
    dispatch({ type: 'ADD_ACTIVITY', payload: item })
    return item.id
  }, [])

  const registerCommands = useCallback((commands) => {
    dispatch({ type: 'REGISTER_COMMANDS', payload: commands })
    return () => dispatch({
      type: 'UNREGISTER_COMMANDS',
      payload: (commands || []).map((command) => command.id),
    })
  }, [])

  const value = useMemo(() => ({
    ...state,
    patch,
    setCurrentWorkspace,
    setSelectedItem,
    setDirty,
    setValidation,
    openCommandPalette,
    closeCommandPalette,
    openNotificationCenter,
    closeNotificationCenter,
    notify,
    addActivity,
    registerCommands,
    markNotificationRead: (id) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),
    clearNotifications: () => dispatch({ type: 'CLEAR_NOTIFICATIONS' }),
  }), [
    state,
    patch,
    setCurrentWorkspace,
    setSelectedItem,
    setDirty,
    setValidation,
    openCommandPalette,
    closeCommandPalette,
    openNotificationCenter,
    closeNotificationCenter,
    notify,
    addActivity,
    registerCommands,
  ])

  return (
    <WorkspaceServicesContext.Provider value={value}>
      {children}
    </WorkspaceServicesContext.Provider>
  )
}
