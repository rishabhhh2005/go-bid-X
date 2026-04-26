import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchActivityLogs, fetchBids, fetchRfq, placeBid } from '../services/appService'

const parseUtcDate = (value) => {
  if (!value) return null
  const stringValue = String(value)
  const utcString = stringValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    ? `${stringValue}Z`
    : stringValue
  const date = new Date(utcString)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatLabel = (value) => {
  const date = parseUtcDate(value)
  return date ? date.toLocaleString() : '—'
}

export default function RFQDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rfq, setRfq] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [bidData, setBidData] = useState({
    carrier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    total_amount: '',
    transit_time_days: '',
    quote_validity_date: '',
  })
  const [activityLogs, setActivityLogs] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showExtensionAlert, setShowExtensionAlert] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedBidIds, setExpandedBidIds] = useState(new Set())

  const toggleBidExpansion = (bidId) => {
    setExpandedBidIds((current) => {
      const next = new Set(current)
      if (next.has(bidId)) next.delete(bidId)
      else next.add(bidId)
      return next
    })
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [rfqResponse, bidResponse, activityResponse] = await Promise.all([
          fetchRfq(id),
          fetchBids(id),
          fetchActivityLogs(id)
        ])
        setRfq(rfqResponse)
        setBids(bidResponse)
        setActivityLogs(activityResponse)
      } catch (err) {
        setError('Unable to load RFQ or bids. Check the ID and try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  useEffect(() => {
    if (!id) return
    
    // Connect using the explicit IP to avoid localhost resolution issues
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//127.0.0.1:8000/ws/rfq/${id}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => console.log('WebSocket connected to', wsUrl)
    ws.onerror = (err) => console.error('WebSocket error:', err)
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('WebSocket message received:', message)
        
        if (message.event === 'new_bid') {
          // Fetch the absolute latest data
          const [refreshedBids, refreshedActivity] = await Promise.all([
            fetchBids(id),
            fetchActivityLogs(id)
          ])
          setBids(refreshedBids)
          setActivityLogs(refreshedActivity)
          
          // Update RFQ state with new close time from message
          if (message.current_bid_close_time) {
            setRfq((current) => {
              if (!current) return null
              return { ...current, current_bid_close_time: message.current_bid_close_time }
            })
          }

          if (message.extended) {
            setShowExtensionAlert(true)
            setTimeout(() => setShowExtensionAlert(false), 5000)
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err)
      }
    }

    return () => {
      ws.close()
    }
  }, [id])

  const canSubmitBid = useMemo(() => {
    return user?.role === 'supplier' && rfq?.status === 'active'
  }, [user, rfq])

  const isInTriggerWindow = useMemo(() => {
    if (!rfq || !rfq.auction_config || rfq.status !== 'active') return false
    const closeTime = parseUtcDate(rfq.current_bid_close_time)
    if (!closeTime) return false
    const triggerTime = new Date(closeTime.getTime() - rfq.auction_config.trigger_window_minutes * 60000)
    return currentTime >= triggerTime && currentTime < closeTime
  }, [rfq, currentTime])

  const isAtForcedLimit = useMemo(() => {
    if (!rfq) return false
    const currentClose = parseUtcDate(rfq.current_bid_close_time)
    const forcedClose = parseUtcDate(rfq.forced_bid_close_time)
    return currentClose && forcedClose && currentClose.getTime() >= forcedClose.getTime()
  }, [rfq])

  const handleBidChange = (key) => (event) => {
    setBidData((current) => ({ ...current, [key]: event.target.value }))
  }

  const handleSubmitBid = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await placeBid({
        rfq_id: id,
        carrier_name: bidData.carrier_name,
        freight_charges: Number(bidData.freight_charges),
        origin_charges: Number(bidData.origin_charges),
        destination_charges: Number(bidData.destination_charges),
        total_amount: Number(bidData.total_amount),
        transit_time_days: bidData.transit_time_days ? Number(bidData.transit_time_days) : null,
        quote_validity_date: bidData.quote_validity_date ? new Date(bidData.quote_validity_date).toISOString() : null,
      })
      const [refreshedBids, refreshedActivity] = await Promise.all([
        fetchBids(id),
        fetchActivityLogs(id)
      ])
      setBids(refreshedBids)
      setActivityLogs(refreshedActivity)
      setSuccess('Bid submitted successfully.')
      setBidData({ 
        carrier_name: '', 
        freight_charges: '', 
        origin_charges: '', 
        destination_charges: '', 
        total_amount: '',
        transit_time_days: '',
        quote_validity_date: ''
      })
    } catch (err) {
      setError('Failed to submit bid. Verify the values and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </button>
          <h1 className="text-3xl font-semibold text-slate-900">RFQ details</h1>
        </div>

        {showExtensionAlert && (
          <div className="fixed top-6 right-6 z-50 animate-bounce rounded-2xl bg-amber-500 p-4 text-white shadow-2xl ring-4 ring-amber-200">
            <p className="flex items-center gap-2 font-bold">
              <span className="text-2xl">⏳</span>
              AUCTION EXTENDED! New bids in trigger window.
            </p>
          </div>
        )}

        {isInTriggerWindow && (
          <div className={`rounded-3xl p-6 text-center shadow-lg ring-4 ${isAtForcedLimit ? 'bg-red-600 text-white ring-red-200 animate-pulse' : 'bg-amber-100 text-amber-900 ring-amber-200'}`}>
            <h2 className="text-xl font-bold uppercase tracking-wider">
              {isAtForcedLimit ? '🚨 FORCED BID CLOSE TIMELINE 🚨' : '⚡ TRIGGER WINDOW ACTIVE ⚡'}
            </h2>
            <p className="mt-2 text-sm opacity-90">
              {isAtForcedLimit 
                ? 'The auction has reached its maximum extension limit. No further extensions possible.' 
                : 'Bids placed now will extend the auction duration!'}
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">Loading auction data…</div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 p-8 text-center text-red-700 shadow-sm ring-1 ring-red-200">{error}</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">{rfq.reference_id}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{rfq.name}</h2>
                </div>
                <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
                  {rfq.status}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Current close</p>
                  <p className="mt-2">{formatLabel(rfq.current_bid_close_time)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Forced close</p>
                  <p className="mt-2">{formatLabel(rfq.forced_bid_close_time)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Bid start</p>
                  <p className="mt-2">{formatLabel(rfq.bid_start_time)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Auction type</p>
                  <p className="mt-2">{rfq.is_british_auction ? 'British auction' : 'Standard auction'}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Buyer ID</p>
                  <p className="mt-2 break-all">{rfq.buyer_id}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Bid close</p>
                  <p className="mt-2">{formatLabel(rfq.bid_close_time)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Pickup date</p>
                  <p className="mt-2">{formatLabel(rfq.pickup_service_date)}</p>
                </div>
              </div>

              {rfq.auction_config && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Auction Configuration</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 p-3 text-sm">
                      <p className="text-slate-500">Trigger Window</p>
                      <p className="font-semibold">{rfq.auction_config.trigger_window_minutes} minutes</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-3 text-sm">
                      <p className="text-slate-500">Extension Duration</p>
                      <p className="font-semibold">{rfq.auction_config.extension_duration_minutes} minutes</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-3 text-sm">
                      <p className="text-slate-500">Trigger Logic</p>
                      <p className="font-semibold uppercase">{rfq.auction_config.extension_trigger_type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">Live bid board</h2>
                <p className="text-sm text-slate-600">Updates over websocket</p>
              </div>

              <div className="mt-6 space-y-3">
                {bids.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-slate-600">No bids yet.</div>
                ) : (
                  bids
                    .slice()
                    .sort((a, b) => {
                      // Active bids first
                      if (a.is_active && !b.is_active) return -1
                      if (!a.is_active && b.is_active) return 1
                      // Then by rank if active
                      if (a.is_active && b.is_active) {
                        if (a.rank && b.rank) return a.rank - b.rank
                        if (a.rank) return -1
                        if (b.rank) return 1
                      }
                      // Then by newest first
                      return new Date(b.submitted_at) - new Date(a.submitted_at)
                    })
                    .map((bid) => {
                      const isExpanded = expandedBidIds.has(bid.id)
                      return (
                        <div key={bid.id} className={`rounded-3xl border transition-all ${bid.is_active ? 'border-sky-200 bg-white shadow-sm ring-1 ring-sky-50' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
                          <button 
                            onClick={() => toggleBidExpansion(bid.id)}
                            className="flex w-full items-center justify-between gap-4 p-4 text-left"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-semibold text-slate-900">
                                "{bid.supplier_name || 'Supplier'}" ({bid.supplier_email || 'no email'}) submitted a bid
                              </p>
                              <p className="text-xs text-slate-500">
                                {bid.is_active ? (
                                  <span className="font-bold text-sky-600">ACTIVE BID</span>
                                ) : (
                                  <span className="italic">Superseded</span>
                                )} 
                                • {formatLabel(bid.submitted_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {bid.rank && (
                                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">L{bid.rank}</span>
                              )}
                              <span className="text-lg font-bold text-slate-900">${bid.total_amount?.toLocaleString()}</span>
                              <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="border-t border-slate-100 p-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
                                <div>
                                  <p className="font-semibold text-slate-900">Carrier: {bid.carrier_name}</p>
                                  <p className="mt-1">Transit: {bid.transit_time_days ? `${bid.transit_time_days} days` : 'N/A'}</p>
                                  <p>Validity: {bid.quote_validity_date ? formatLabel(bid.quote_validity_date).split(',')[0] : 'N/A'}</p>
                                </div>
                                <div className="grid gap-1 text-xs text-slate-500">
                                  <p>Freight Charges: ${bid.freight_charges}</p>
                                  <p>Origin Charges: ${bid.origin_charges}</p>
                                  <p>Destination Charges: ${bid.destination_charges}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                )}
              </div>

              <div className="mt-10">
                <h2 className="text-xl font-semibold text-slate-900">Activity Log</h2>
                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No activity yet.</p>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex-shrink-0 mt-1">
                          {log.event_type === 'time_extended' ? '⏳' : log.event_type === 'bid_submitted' ? '📝' : '🔒'}
                        </div>
                        <div>
                          <p className="text-sm text-slate-800">{log.description}</p>
                          {log.extension_reason && (
                            <p className="text-xs text-sky-600 mt-1 uppercase font-semibold">Reason: {log.extension_reason.replace(/_/g, ' ')}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">{formatLabel(log.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {canSubmitBid && (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Place a bid</h2>
                <p className="mt-2 text-sm text-slate-600">Suppliers can submit a lower bid to improve ranking.</p>
                <form onSubmit={handleSubmitBid} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Carrier name</span>
                      <input
                        value={bidData.carrier_name}
                        onChange={handleBidChange('carrier_name')}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Total amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.total_amount}
                        onChange={handleBidChange('total_amount')}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Freight charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.freight_charges}
                        onChange={handleBidChange('freight_charges')}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Origin charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.origin_charges}
                        onChange={handleBidChange('origin_charges')}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Destination charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.destination_charges}
                        onChange={handleBidChange('destination_charges')}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Transit time (days)</span>
                      <input
                        type="number"
                        value={bidData.transit_time_days}
                        onChange={handleBidChange('transit_time_days')}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Quote validity</span>
                      <input
                        type="datetime-local"
                        value={bidData.quote_validity_date}
                        onChange={handleBidChange('quote_validity_date')}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                  </div>

                  {(error || success) && (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                      {error || success}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting bid…' : 'Submit bid'}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
