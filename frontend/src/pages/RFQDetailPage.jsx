import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
        console.error('Error loading data:', err)
        setError('Unable to load RFQ or bids. Check the ID and try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  useEffect(() => {
    if (!id) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
    const host = apiUrl.replace(/^https?:\/\//, '')
    const wsUrl = `${protocol}//${host}/ws/rfq/${id}`
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

    // 1. Validate Sum of Charges
    const freight = Number(bidData.freight_charges) || 0
    const origin = Number(bidData.origin_charges) || 0
    const destination = Number(bidData.destination_charges) || 0
    const total = Number(bidData.total_amount) || 0
    const calculatedTotal = Number((freight + origin + destination).toFixed(2))

    if (Math.abs(calculatedTotal - total) > 0.01) {
      setError(`Entry Error: The Total Amount ($${total}) does not match the sum of charges ($${calculatedTotal}). Please verify that Freight + Origin + Destination equals Total.`)
      setSubmitting(false)
      return
    }

    // 2. Validate Lower Bid (Reverse Auction)
    const myCurrentBestBid = bids.find(b => b.supplier_id === user?.id && b.is_active)
    if (myCurrentBestBid && total >= myCurrentBestBid.total_amount) {
      setError(`Bid Higher Error: You already have a bid of $${myCurrentBestBid.total_amount}. In a reverse auction, you must submit a LOWER bid to improve your position.`)
      setSubmitting(false)
      return
    }

    try {
      await placeBid({
        rfq_id: id,
        carrier_name: bidData.carrier_name,
        freight_charges: freight,
        origin_charges: origin,
        destination_charges: destination,
        total_amount: total,
        transit_time_days: bidData.transit_time_days ? Number(bidData.transit_time_days) : null,
        quote_validity_date: bidData.quote_validity_date ? new Date(bidData.quote_validity_date).toISOString() : null,
      })
      const [refreshedBids, refreshedActivity] = await Promise.all([
        fetchBids(id),
        fetchActivityLogs(id)
      ])
      setBids(refreshedBids)
      setActivityLogs(refreshedActivity)
      setSuccess('Your bid has been successfully submitted and ranks on the board.')
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
      console.error('Bid submission error:', err)
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to submit bid. Please verify all fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl space-y-8 relative z-10 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass-panel px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-display font-bold text-slate-900">RFQ Details</h1>
        </div>

        {showExtensionAlert && (
          <div className="fixed top-6 right-6 z-50 animate-bounce glass-panel border-amber-200 bg-amber-500/90 backdrop-blur-md p-5 text-slate-900 shadow-2xl">
            <p className="flex items-center gap-3 font-bold text-lg">
              <span className="text-3xl">⏳</span>
              AUCTION EXTENDED! New bids in trigger window.
            </p>
          </div>
        )}

        {isInTriggerWindow && (
          <div className={`glass-panel p-6 text-center shadow-lg border-2 ${isAtForcedLimit ? 'bg-red-600/90 border-red-400 text-slate-900 animate-pulse' : 'bg-amber-100/90 border-amber-300 text-amber-900'}`}>
            <h2 className="text-2xl font-display font-bold uppercase tracking-wider">
              {isAtForcedLimit ? '🚨 FORCED BID CLOSE TIMELINE 🚨' : '⚡ TRIGGER WINDOW ACTIVE ⚡'}
            </h2>
            <p className="mt-2 text-base font-medium opacity-90">
              {isAtForcedLimit
                ? 'The auction has reached its maximum extension limit. Last Chance to Place a Bid, No further extensions possible.'
                : 'Bids placed now will extend the auction duration!'}
            </p>
          </div>
        )}

        {loading ? (
          <div className="glass-card p-16 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="font-medium text-slate-600 animate-pulse text-lg">Loading auction data…</p>
          </div>
        ) : error ? (
          <div className="glass-card bg-red-50/90 border-red-200 p-12 text-center text-red-700 font-medium text-lg flex flex-col items-center gap-4">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.7fr_1fr]">
            <section className="glass-panel p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 mb-2">{rfq.reference_id}</p>
                  <h2 className="text-3xl font-display font-bold text-slate-900">{rfq.name}</h2>
                </div>
                <div className="rounded-full bg-slate-100 border border-slate-200 px-5 py-2 text-sm font-bold uppercase tracking-widest text-slate-700">
                  {rfq.status.replace('_', ' ')}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="glass-card bg-slate-50/50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Current Close</p>
                  <p className="text-lg font-semibold text-slate-900">{formatLabel(rfq.current_bid_close_time)}</p>
                </div>
                <div className="glass-card bg-slate-50/50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Forced Close</p>
                  <p className="text-lg font-semibold text-slate-900">{formatLabel(rfq.forced_bid_close_time)}</p>
                </div>
                <div className="glass-card bg-slate-50/50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bid Start</p>
                  <p className="text-lg font-semibold text-slate-900">{formatLabel(rfq.bid_start_time)}</p>
                </div>
                <div className="glass-card bg-slate-50/50 p-5 border-l-4 border-l-brand-500">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Auction Type</p>
                  <p className="text-lg font-semibold text-brand-700">{rfq.is_british_auction ? 'British Reverse Auction' : 'Standard Auction'}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="glass-card bg-slate-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Buyer ID</p>
                  <p className="text-sm font-mono text-slate-700 truncate" title={rfq.buyer_id}>{rfq.buyer_id}</p>
                </div>
                <div className="glass-card bg-slate-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bid Close (Orig)</p>
                  <p className="text-sm font-medium text-slate-700">{formatLabel(rfq.bid_close_time)}</p>
                </div>
                <div className="glass-card bg-slate-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pickup Date</p>
                  <p className="text-sm font-medium text-slate-700">{formatLabel(rfq.pickup_service_date)}</p>
                </div>
              </div>

              {rfq.auction_config && (
                <div className="mt-10 border-t border-slate-200/60 pt-8">
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Auction Configuration
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="glass-card bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Trigger Window</p>
                      <p className="text-lg font-semibold text-slate-900">{rfq.auction_config.trigger_window_minutes} min</p>
                    </div>
                    <div className="glass-card bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Extension Time</p>
                      <p className="text-lg font-semibold text-slate-900">{rfq.auction_config.extension_duration_minutes} min</p>
                    </div>
                    <div className="glass-card bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Trigger Logic</p>
                      <p className="text-sm font-semibold text-slate-900 uppercase mt-1">{rfq.auction_config.extension_trigger_type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="glass-panel p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                  </span>
                  Live Bid Board
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">Live Updates</p>
              </div>

              <div className="mt-6 space-y-3">
                {bids.length === 0 ? (
                  <div className="glass-card p-10 text-center text-slate-500 border-dashed border-2">No bids have been placed yet.</div>
                ) : (
                  bids
                    .slice()
                    .sort((a, b) => {
                      if (a.is_active && !b.is_active) return -1
                      if (!a.is_active && b.is_active) return 1
                      if (a.is_active && b.is_active) {
                        if (a.rank && b.rank) return a.rank - b.rank
                        if (a.rank) return -1
                        if (b.rank) return 1
                      }
                      return new Date(b.submitted_at) - new Date(a.submitted_at)
                    })
                    .map((bid) => {
                      const isExpanded = expandedBidIds.has(bid.id)
                      return (
                        <div key={bid.id} className={`glass-card overflow-hidden transition-all duration-300 ${bid.is_active ? 'border-brand-300 bg-white/90 shadow-md transform hover:-translate-y-1 hover:shadow-lg' : 'border-slate-200 bg-slate-50/50 opacity-75'}`}>
                          <button
                            onClick={() => toggleBidExpansion(bid.id)}
                            className="flex w-full items-center justify-between gap-4 p-5 text-left"
                          >
                            <div className="flex flex-col gap-2">
                              <p className="text-base font-semibold text-slate-900">
                                {bid.supplier_name || 'Supplier'} <span className="text-sm font-normal text-slate-500">({bid.supplier_email || 'no email'})</span>
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                {bid.is_active ? (
                                  <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                                ) : (
                                  <span className="font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">Superseded</span>
                                )}
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500 font-medium">{formatLabel(bid.submitted_at)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {bid.rank && (
                                <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-full ${bid.rank === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                                  <span className="text-[10px] font-bold uppercase leading-none mt-1">Rank</span>
                                  <span className="text-lg font-bold leading-none">{bid.rank}</span>
                                </div>
                              )}
                              <span className="text-2xl font-display font-bold text-slate-900">${bid.total_amount?.toLocaleString()}</span>
                              <span className={`text-brand-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-slide-up origin-top">
                              <div className="grid gap-6 sm:grid-cols-2 text-sm text-slate-700">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carrier Details</p>
                                    <p className="font-semibold text-slate-900 text-base">{bid.carrier_name}</p>
                                  </div>
                                  <div className="flex gap-4">
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transit</p>
                                      <p className="font-medium text-slate-800">{bid.transit_time_days ? `${bid.transit_time_days} Days` : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quote Valid Until</p>
                                      <p className="font-medium text-slate-800">{bid.quote_validity_date ? formatLabel(bid.quote_validity_date).split(',')[0] : 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-2">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Breakdown</p>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Freight</span>
                                    <span className="font-medium text-slate-900">${bid.freight_charges}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Origin</span>
                                    <span className="font-medium text-slate-900">${bid.origin_charges}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                    <span className="text-slate-600">Destination</span>
                                    <span className="font-medium text-slate-900">${bid.destination_charges}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-base pt-1">
                                    <span className="font-bold text-slate-900">Total</span>
                                    <span className="font-bold text-brand-600">${bid.total_amount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                )}
              </div>

              <div className="mt-12">
                <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activity Log
                </h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {activityLogs.length === 0 ? (
                    <div className="glass-card p-8 text-center text-slate-500 border-dashed border-2">No activity recorded yet.</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg shadow-inner-light border border-slate-100">
                          {log.event_type === 'time_extended' ? '⏳' : log.event_type === 'bid_submitted' ? '📝' : '🔒'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{log.description}</p>
                          {log.extension_reason && (
                            <p className="inline-block mt-2 px-2 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wider rounded border border-sky-100">
                              Reason: {log.extension_reason.replace(/_/g, ' ')}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatLabel(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {canSubmitBid && (
              <section className="glass-panel p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-400/10 rounded-bl-full pointer-events-none" />
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Place a bid</h2>
                <p className="text-sm font-medium text-slate-500 mb-8">Suppliers can submit a lower bid to improve their rank in the auction.</p>
                <form onSubmit={handleSubmitBid} className="space-y-6 relative z-10">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Carrier Name</span>
                      <input
                        value={bidData.carrier_name}
                        onChange={handleBidChange('carrier_name')}
                        required
                        placeholder="e.g. Fast Freight Co."
                        className="input-field"
                      />
                    </label>
                    <label className="block">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Total Amount ($)</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all duration-300 ${bidData.total_amount && Math.abs((Number(bidData.freight_charges || 0) + Number(bidData.origin_charges || 0) + Number(bidData.destination_charges || 0)) - Number(bidData.total_amount)) > 0.01
                          ? 'bg-red-100 text-red-700 ring-1 ring-red-200 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                          }`}>
                          Calculated: ${(Number(bidData.freight_charges || 0) + Number(bidData.origin_charges || 0) + Number(bidData.destination_charges || 0)).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.total_amount}
                        onChange={handleBidChange('total_amount')}
                        required
                        placeholder="Sum of all charges"
                        className={`input-field font-bold transition-all ${bidData.total_amount && Math.abs((Number(bidData.freight_charges || 0) + Number(bidData.origin_charges || 0) + Number(bidData.destination_charges || 0)) - Number(bidData.total_amount)) > 0.01
                          ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-brand-200 bg-brand-50/30 focus:border-brand-500 focus:ring-brand-500/30 text-brand-900'
                          }`}
                      />
                    </label>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Freight Charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.freight_charges}
                        onChange={handleBidChange('freight_charges')}
                        required
                        className="input-field bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Origin Charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.origin_charges}
                        onChange={handleBidChange('origin_charges')}
                        required
                        className="input-field bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Destination Charges</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bidData.destination_charges}
                        onChange={handleBidChange('destination_charges')}
                        required
                        className="input-field bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Transit Time (Days)</span>
                      <input
                        type="number"
                        value={bidData.transit_time_days}
                        onChange={handleBidChange('transit_time_days')}
                        placeholder="Optional"
                        className="input-field"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Quote Validity</span>
                      <input
                        type="datetime-local"
                        value={bidData.quote_validity_date}
                        onChange={handleBidChange('quote_validity_date')}
                        className="input-field"
                      />
                    </label>
                  </div>

                  {(error || success) && (
                    <div className={`rounded-xl p-4 flex items-start gap-3 border ${error ? 'bg-red-50/80 border-red-200 text-red-800' : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'}`}>
                      <svg className={`w-5 h-5 shrink-0 mt-0.5 ${error ? 'text-red-500' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {error ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      <p className="text-sm font-medium">{error || success}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-primary py-4 text-base flex justify-center items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Submitting Bid...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Submit Official Bid</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
