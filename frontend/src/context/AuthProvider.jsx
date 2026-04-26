import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, loginRequest, registerRequest } from '../services/appService'
import { getLocalUser, saveLocalUser, removeLocalUser } from '../services/localStorage'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getLocalUser())
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('gobidx_token')
    return !!token
  })
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('gobidx_token')
    
    if (!storedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (loading) setLoading(false)
      if (user) {
        setUser(null)
        removeLocalUser()
      }
      return
    }

    const loadProfile = async () => {
      try {
        const profile = await getCurrentUser()
        setUser(profile)
        saveLocalUser(profile)
      } catch (error) {
        console.error('Failed to load profile:', error)
        localStorage.removeItem('gobidx_token')
        removeLocalUser()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const data = await loginRequest({ email, password })
    localStorage.setItem('gobidx_token', data.access_token)
    const profile = await getCurrentUser()
    setUser(profile)
    saveLocalUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gobidx_token')
    removeLocalUser()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const register = useCallback(async (payload) => {
    await registerRequest(payload)
    return login({ email: payload.email, password: payload.password })
  }, [login])

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'gobidx_token' || event.key === 'gobidx_user') {
        window.location.reload()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, logout, register],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
