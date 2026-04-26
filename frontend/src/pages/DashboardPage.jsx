import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SectionHeader from '../components/SectionHeader'
import { fetchRfqs, deleteRfq } from '../services/appService'
import { getLocalRfqs, removeLocalRfq } from '../services/localStorage'

const parseUtcDate = (value) => {
  if (!value) return null
  const stringValue = String(value)
  const utcString = stringValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    ? `${stringValue}Z`
    : stringValue
  const date = new Date(utcString)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = parseUtcDate(value)
  return date ? date.toLocaleString() : '—'
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openRfqId, setOpenRfqId] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadRfqs = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchRfqs()
        const list = Array.isArray(response) ? response : []
        setRfqs(list)
      } catch (err) {
        const local = getLocalRfqs()
        setRfqs(local)
        if (local.length === 0) {
          setError('RFQ list is unavailable from the backend. Create RFQs to continue.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadRfqs()
  }, [])

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteRfq(id)
      setRfqs((current) => current.filter((item) => item.id !== id))
      removeLocalRfq(id)
    } catch (err) {
      setError('Failed to delete RFQ. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenRfq = (event) => {
    event.preventDefault()
    if (!openRfqId.trim()) return
    navigate(`/rfq/${openRfqId.trim()}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <SectionHeader
            title={`Welcome back, ${user?.full_name}`}
            subtitle={user?.role === 'buyer' ? 'Manage your RFQs and view buyer insights.' : 'Browse RFQs and place competitive bids.'}
            action={(
              <div className="flex flex-wrap gap-3">
                <button onClick={logout} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Sign out
                </button>
                {user?.role === 'buyer' && (
                  <Link to="/rfq/new" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                    Create RFQ
                  </Link>
                )}
              </div>
            )}
          />
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">RFQ feed</h2>
                <p className="mt-1 text-sm text-slate-600">Latest available RFQs for {user?.role} access.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                {user?.role}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Loading RFQs…</div>
              ) : rfqs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No RFQs found.</div>
              ) : (
                rfqs.map((rfq) => (
                  <div key={rfq.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm transition hover:border-sky-300 hover:shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{rfq.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">Reference: {rfq.reference_id}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                          {rfq.status}
                        </span>
                        <Link to={`/rfq/${rfq.id}`} className="rounded-2xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                          View details
                        </Link>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Current lowest bid</p>
                        <p className="mt-2 text-sky-600 font-bold">{rfq.current_lowest_bid ? `$${rfq.current_lowest_bid.toLocaleString()}` : 'No bids yet'}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Start time</p>
                        <p className="mt-2">{formatDate(rfq.bid_start_time)}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Current close time</p>
                        <p className="mt-2">{formatDate(rfq.current_bid_close_time)}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Forced close time</p>
                        <p className="mt-2">{formatDate(rfq.forced_bid_close_time)}</p>
                      </div>
                    </div>
                    {user?.role === 'buyer' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(rfq.id)}
                        disabled={deletingId === rfq.id}
                        className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                      >
                        {deletingId === rfq.id ? 'Deleting…' : 'Delete RFQ'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {error && <div className="mt-6 rounded-3xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
          </div>

          <aside className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
              <p className="mt-2 text-sm text-slate-600">Open RFQ details by reference ID or UUID.</p>
            </div>

            <form onSubmit={handleOpenRfq} className="space-y-4">
              <label className="text-sm font-medium text-slate-700">RFQ reference ID or UUID</label>
              <input
                value={openRfqId}
                onChange={(event) => setOpenRfqId(event.target.value)}
                placeholder="paste a reference ID or UUID"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Open RFQ
              </button>
            </form>

            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Supplier tip</p>
              <p className="mt-2">Supplier users can open any known RFQ by ID, then place a live bid using the auction detail page.</p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
