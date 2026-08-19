import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import keycloak from './keycloak'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const initializedRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [apiReady, setApiReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [tokenParsed, setTokenParsed] = useState(null)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let active = true

    async function init() {
      try {
        const authenticatedNow = await keycloak.init({
          onLoad: 'login-required',
          pkceMethod: 'S256',
          checkLoginIframe: false,
        })

        if (!active) return

        setAuthenticated(authenticatedNow)
        setTokenParsed(keycloak.tokenParsed || null)

        if (authenticatedNow) {
          try {
            const userProfile = await keycloak.loadUserProfile()
            if (active) setProfile(userProfile)
          } catch (error) {
            console.warn('IAS profile load failed', error)
          }
        }

        setReady(true)
      } catch (error) {
        console.error('NOVASpace IAS initialization failed', error)
        if (active) setReady(true)
      }
    }

    init()

    const refreshTimer = window.setInterval(async () => {
      if (!keycloak.authenticated) return

      try {
        const refreshed = await keycloak.updateToken(60)

        if (refreshed && active) {
          setTokenParsed(keycloak.tokenParsed || null)
        }
      } catch (error) {
        console.error('IAS token refresh failed', error)
        keycloak.login()
      }
    }, 30000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  /*
   * EUREKA IAS
   * Intercetta centralmente le chiamate API Proximity.
   *
   * Tutte le richieste same-origin verso /api/* ricevono:
   *
   * Authorization: Bearer <NOVASPACE IAS token>
   *
   * Non interferisce con richieste esterne, asset statici,
   * firmware URL esterni o chiamate Keycloak.
   */
  useEffect(() => {
    if (!authenticated) return

    const nativeFetch = window.fetch.bind(window)

    window.fetch = async (input, init = {}) => {
      const rawUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input?.url

      if (!rawUrl) {
        return nativeFetch(input, init)
      }

      let parsedUrl

      try {
        parsedUrl = new URL(rawUrl, window.location.origin)
      } catch {
        return nativeFetch(input, init)
      }

      const isSameOrigin =
        parsedUrl.origin === window.location.origin

      const isProximityApi =
        parsedUrl.pathname.startsWith('/api/')

      if (!isSameOrigin || !isProximityApi) {
        return nativeFetch(input, init)
      }

      try {
        await keycloak.updateToken(30)
      } catch (error) {
        console.error('IAS token refresh before API call failed', error)
        await keycloak.login()
        throw error
      }

      const existingHeaders =
        input instanceof Request
          ? input.headers
          : undefined

      const headers = new Headers(
        init.headers || existingHeaders || {}
      )

      if (keycloak.token) {
        headers.set(
          'Authorization',
          `Bearer ${keycloak.token}`
        )
      }

      return nativeFetch(input, {
        ...init,
        headers,
      })
    }

    setApiReady(true)

    return () => {
      setApiReady(false)
      window.fetch = nativeFetch
    }
  }, [authenticated])

  const logout = useCallback(() => {
    return keycloak.logout({
      redirectUri: window.location.origin,
    })
  }, [])

  const hasRealmRole = useCallback((role) => {
    return keycloak.hasRealmRole(role)
  }, [])

  const getToken = useCallback(async () => {
    if (!keycloak.authenticated) return null

    await keycloak.updateToken(30)
    return keycloak.token || null
  }, [])

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      apiReady,
      profile,
      tokenParsed,

      username:
        tokenParsed?.preferred_username ||
        profile?.username ||
        null,

      displayName:
        tokenParsed?.name ||
        [profile?.firstName, profile?.lastName]
          .filter(Boolean)
          .join(' ') ||
        tokenParsed?.preferred_username ||
        null,

      email:
        tokenParsed?.email ||
        profile?.email ||
        null,

      realmRoles:
        tokenParsed?.realm_access?.roles || [],

      hasRealmRole,
      getToken,
      logout,
      keycloak,
    }),
    [
      ready,
      authenticated,
      apiReady,
      profile,
      tokenParsed,
      hasRealmRole,
      getToken,
      logout,
    ]
  )

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Connessione a NOVASpace IAS...
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Autenticazione richiesta...
      </div>
    )
  }

  if (!apiReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Preparazione sessione sicura...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}
