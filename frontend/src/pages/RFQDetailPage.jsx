import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchBids, fetchRfq, placeBid } from '../services/appService'

const formatLabel = (value) => (value ? new Date(value).toLocaleString() : '—')

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
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [rfqResponse, bidResponse] = await Promise.all([fetchRfq(id), fetchBids(id)])
        setRfq(rfqResponse)
        setBids(bidResponse)
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
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/rfq/${id}`)

    ws.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.event === 'new_bid') {
          const refreshedBids = await fetchBids(id)
          setBids(refreshedBids)
          setRfq((current) => (current ? { ...current, current_bid_close_time: message.current_bid_close_time } : current))
        }
      } catch {
        // ignore malformed websocket messages
      }
    })

    return () => {
      ws.close()
    }
  }, [id])

  const canSubmitBid = useMemo(() => {
    return user?.role === 'supplier' && rfq?.status === 'active'
  }, [user, rfq])

  const handleBidChange = (key) => (event) => {
    setBidData((current) => ({ ...current, [key]: event.target.value }))
  }

  const handleSubmitBid = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await placeBid({
        rfq_id: id,
        carrier_name: bidData.carrier_name,
        freight_charges: Number(bidData.freight_charges),
        origin_charges: Number(bidData.origin_charges),
        destination_charges: Number(bidData.destination_charges),
        total_amount: Number(bidData.total_amount),
        transit_time_days: null,
        quote_validity_date: null,
      })
      const refreshedBids = await fetchBids(id)
      setBids(refreshedBids)
      setSuccess('Bid submitted successfully.')
      setBidData({ carrier_name: '', freight_charges: '', origin_charges: '', destination_charges: '', total_amount: '' })
    } catch (err) {
      setError('Failed to submit bid. Verify the values and try again.')
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
              </div>
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
                    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                    .map((bid) => (
                      <div key={bid.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{bid.carrier_name || 'Supplier'}</p>
                            <p className="mt-1 text-sm text-slate-600">Supplier ID: {bid.supplier_id}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{bid.rank ? `L${bid.rank}` : 'L–'}</span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                          <p>Total: {bid.total_amount != null ? `$${bid.total_amount}` : '–'}</p>
                          <p>Submitted: {bid.submitted_at ? new Date(bid.submitted_at).toLocaleString() : '–'}</p>
                        </div>
                      </div>
                    ))
                )}
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
                  </div>

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

                  {(error || success) && (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                      {error || success}
                    </div>
                  )}

                  <button type="submit" className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                    Submit bid
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
