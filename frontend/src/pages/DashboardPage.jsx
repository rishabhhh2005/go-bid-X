import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
        console.error('Error loading RFQs:', err)
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
      console.error('Error deleting RFQ:', err)
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
    <div className="min-h-screen relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-300/20 blur-[100px] pointer-events-none" />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 relative z-10 animate-fade-in">
        <header className="glass-panel p-8 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              Welcome back, <span className="text-brand-600">{user?.full_name}</span>
            </h1>
            <p className="mt-2 text-slate-600 text-lg">
              {user?.role === 'buyer' ? 'Manage your RFQs and view buyer insights.' : 'Browse RFQs and place competitive bids.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={logout} className="btn-secondary">
              Sign out
            </button>
            {user?.role === 'buyer' && (
              <Link to="/rfq/new" className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create RFQ
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 glass-panel px-6 py-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">RFQ Feed</h2>
                <p className="text-sm text-slate-500">Latest active auctions</p>
              </div>
              <span className="rounded-full bg-brand-100 text-brand-700 px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-brand-200">
                {user?.role} Access
              </span>
            </div>

            <div className="space-y-5">
              {loading ? (
                <div className="glass-card p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                  <p className="font-medium animate-pulse">Loading RFQs...</p>
                </div>
              ) : rfqs.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No RFQs found</h3>
                  <p className="mt-1 text-slate-500">There are currently no RFQs available.</p>
                </div>
              ) : (
                rfqs.map((rfq) => (
                  <div key={rfq.id} className="glass-card p-6 border-l-4 border-l-brand-500 hover:border-l-brand-600">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{rfq.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            rfq.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                            rfq.status === 'closed' || rfq.status === 'force_closed' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                            'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {rfq.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded">ID: {rfq.reference_id}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {user?.role === 'buyer' && user?.id === rfq.buyer_id && (
                          <button
                            type="button"
                            onClick={() => handleDelete(rfq.id)}
                            disabled={deletingId === rfq.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete RFQ"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <Link to={`/rfq/${rfq.id}`} className="btn-primary py-2 text-sm shadow-none">
                          View details
                        </Link>
                      </div>
                    </div>
                    
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner-light">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Lowest Bid</p>
                        <p className="text-lg font-bold text-brand-600">
                          {rfq.current_lowest_bid ? `$${rfq.current_lowest_bid.toLocaleString()}` : 'No bids yet'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner-light">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Start Time</p>
                        <p className="text-sm font-medium text-slate-800">{formatDate(rfq.bid_start_time)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner-light">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Close Time</p>
                        <p className="text-sm font-medium text-slate-800">{formatDate(rfq.current_bid_close_time)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner-light">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Forced Close</p>
                        <p className="text-sm font-medium text-slate-800">{formatDate(rfq.forced_bid_close_time)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="glass-card border-red-200 bg-red-50/80 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="glass-panel p-6 sticky top-6">
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-slate-900">Quick Actions</h2>
                <p className="mt-1 text-sm text-slate-500">Access specific RFQs directly</p>
              </div>

              <form onSubmit={handleOpenRfq} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Reference ID / UUID</label>
                  <input
                    value={openRfqId}
                    onChange={(event) => setOpenRfqId(event.target.value)}
                    placeholder="e.g. RFQ-12345"
                    className="input-field"
                  />
                </div>
                <button type="submit" className="w-full btn-primary bg-slate-800 hover:bg-slate-900 flex justify-center items-center gap-2">
                  <span>Open RFQ</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>

              <div className="mt-8 rounded-xl bg-blue-50/80 p-5 border border-blue-100 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-200 rounded-full opacity-50 blur-xl" />
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-bold text-slate-900 text-sm">Pro Tip</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed relative z-10">
                  {user?.role === 'supplier' 
                    ? 'Enter an RFQ Reference ID provided by the buyer to jump directly to the live bidding room.' 
                    : 'Share the Reference ID of your RFQs with suppliers so they can find them quickly.'}
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
