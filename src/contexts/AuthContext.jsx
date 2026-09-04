import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, clearAuth, getStoredAuth, storeAuth } from '../lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const stored = getStoredAuth()
  const [token, setToken] = useState(stored.token)
  const [user, setUser] = useState(stored.user)
  const [loading, setLoading] = useState(Boolean(stored.token))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    authApi
      .me()
      .then((data) => {
        if (cancelled) return
        setUser(data.user)
        storeAuth({ token, user: data.user })
      })
      .catch(() => {
        if (cancelled) return
        clearAuth()
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function login(credentials) {
    const data = await authApi.login(credentials)
    storeAuth(data)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    clearAuth()
    setToken(null)
    setUser(null)
  }

  const updateUser = useCallback((nextUser) => {
    if (!token) return
    storeAuth({ token, user: nextUser })
    setUser(nextUser)
  }, [token])

  const value = useMemo(
    () => ({
      authenticated: Boolean(token && user),
      loading,
      login,
      logout,
      token,
      updateUser,
      user,
    }),
    [loading, token, updateUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
