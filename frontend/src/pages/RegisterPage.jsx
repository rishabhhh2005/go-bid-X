import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
      setError('Unable to register. Check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Create your GoBidX account</h1>
        <p className="mt-2 text-sm text-slate-600">Register as a buyer or supplier to start bidding and sourcing.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <div className="mt-2 flex gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-400">
                <input type="radio" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} className="h-4 w-4 text-sky-600" />
                Buyer
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-400">
                <input type="radio" value="supplier" checked={role === 'supplier'} onChange={() => setRole('supplier')} className="h-4 w-4 text-sky-600" />
                Supplier
              </label>
            </div>
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
