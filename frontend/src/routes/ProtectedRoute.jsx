import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">Loading authenticated session...</div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}
