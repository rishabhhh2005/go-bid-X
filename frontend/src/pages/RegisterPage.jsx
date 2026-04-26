import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('buyer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ email, password, full_name: fullName, company_name: companyName, role })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Registration error:', err)
      setError('Unable to register. Check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none" />

      <div className="max-w-xl w-full space-y-8 glass-panel p-10 relative z-10 animate-fade-in shadow-2xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-500/30 transform transition-transform hover:scale-105">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Create an Account</h1>
          <p className="mt-3 text-base text-slate-600">Register as a buyer or supplier to start bidding and sourcing.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                placeholder="John Doe"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Acme Corp (Optional)"
                className="input-field"
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@company.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Select Role</label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${role === 'buyer' ? 'border-brand-500 bg-brand-50 shadow-md transform scale-[1.02]' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
                <input type="radio" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === 'buyer' ? 'border-brand-600' : 'border-slate-300'}`}>
                  {role === 'buyer' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                </div>
                <span className={`font-bold ${role === 'buyer' ? 'text-brand-700' : 'text-slate-600'}`}>Buyer</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${role === 'supplier' ? 'border-brand-500 bg-brand-50 shadow-md transform scale-[1.02]' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
                <input type="radio" value="supplier" checked={role === 'supplier'} onChange={() => setRole('supplier')} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === 'supplier' ? 'border-brand-600' : 'border-slate-300'}`}>
                  {role === 'supplier' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                </div>
                <span className={`font-bold ${role === 'supplier' ? 'text-brand-700' : 'text-slate-600'}`}>Supplier</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-4 flex items-start gap-3 border bg-red-50/80 border-red-200 text-red-800 animate-pulse">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-base flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register for GoBidX</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline transition-all">
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}
