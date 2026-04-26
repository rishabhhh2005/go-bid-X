import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, loginRequest, registerRequest } from '../services/appService'
import { getLocalUser, saveLocalUser, removeLocalUser } from '../services/localStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('gobidx_token')
    const cachedUser = getLocalUser()

    if (cachedUser) {
      setUser(cachedUser)
      setLoading(false)
    }

    if (!storedToken) {
      setLoading(false)
      if (cachedUser) {
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
        localStorage.removeItem('gobidx_token')
        removeLocalUser()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const login = async ({ email, password }) => {
    const data = await loginRequest({ email, password })
    localStorage.setItem('gobidx_token', data.access_token)
    const profile = await getCurrentUser()
    setUser(profile)
    saveLocalUser(profile)
    return profile
  }

  const logout = () => {
    localStorage.removeItem('gobidx_token')
    removeLocalUser()
    setUser(null)
    navigate('/login', { replace: true })
  }

  const register = async (payload) => {
    await registerRequest(payload)
    return login({ email: payload.email, password: payload.password })
  }

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
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
