import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, loginRequest, registerRequest } from '../services/appService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('gobidx_token')
    if (!storedToken) {
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const profile = await getCurrentUser()
        setUser(profile)
      } catch (error) {
        localStorage.removeItem('gobidx_token')
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
    return profile
  }

  const logout = () => {
    localStorage.removeItem('gobidx_token')
    setUser(null)
    navigate('/login', { replace: true })
  }

  const register = async (payload) => {
    await registerRequest(payload)
    return login({ email: payload.email, password: payload.password })
  }

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
