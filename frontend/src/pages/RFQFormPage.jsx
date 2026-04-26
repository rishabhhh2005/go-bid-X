import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { createRfq } from '../services/appService'
import { saveLocalRfq } from '../services/localStorage'

const defaultForm = {
  reference_id: '',
  name: '',
  bid_start_time: '',
  bid_close_time: '',
  forced_bid_close_time: '',
  pickup_service_date: '',
  is_british_auction: false,
  trigger_window_minutes: 5,
  extension_duration_minutes: 10,
  extension_trigger_type: 'bid_received',
}

export default function RFQFormPage() {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleChange = (key) => (event) => {
    const value = key === 'is_british_auction' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const payload = {
        reference_id: form.reference_id,
        name: form.name,
        bid_start_time: new Date(form.bid_start_time).toISOString(),
        bid_close_time: new Date(form.bid_close_time).toISOString(),
        forced_bid_close_time: new Date(form.forced_bid_close_time).toISOString(),
        pickup_service_date: form.pickup_service_date ? new Date(form.pickup_service_date).toISOString() : null,
        is_british_auction: form.is_british_auction,
        auction_config: {
          trigger_window_minutes: Number(form.trigger_window_minutes),
          extension_duration_minutes: Number(form.extension_duration_minutes),
          extension_trigger_type: form.extension_trigger_type,
        },
      }

      const created = await createRfq(payload)
      saveLocalRfq(created)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const backendMessage = err.response?.data?.detail
      setError(backendMessage || 'Unable to create RFQ. Verify your dates and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-4xl glass-panel p-8 sm:p-10 relative z-10 animate-fade-in shadow-xl">
        <SectionHeader
          title="New Reverse Auction"
          subtitle="Create an RFQ so suppliers can bid in real time."
          action={(
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          )}
        />

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600 border-b border-slate-200 pb-2">Basic Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Reference ID</span>
                <input
                  value={form.reference_id}
                  onChange={handleChange('reference_id')}
                  required
                  placeholder="e.g. RFQ-2024-001"
                  className="input-field"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">RFQ Name</span>
                <input
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  placeholder="e.g. Q3 Transport Contract"
                  className="input-field"
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600 border-b border-slate-200 pb-2">Timeline</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Start Time</span>
                <input
                  type="datetime-local"
                  value={form.bid_start_time}
                  onChange={handleChange('bid_start_time')}
                  required
                  className="input-field text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Close Time</span>
                <input
                  type="datetime-local"
                  value={form.bid_close_time}
                  onChange={handleChange('bid_close_time')}
                  required
                  className="input-field text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Forced Close</span>
                <input
                  type="datetime-local"
                  value={form.forced_bid_close_time}
                  onChange={handleChange('forced_bid_close_time')}
                  required
                  className="input-field text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Pickup Date</span>
                <input
                  type="datetime-local"
                  value={form.pickup_service_date}
                  onChange={handleChange('pickup_service_date')}
                  className="input-field text-sm"
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600 border-b border-slate-200 pb-2 flex-grow">Auction Configuration</h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 group-hover:text-slate-900">Enable British Auction</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.is_british_auction}
                    onChange={handleChange('is_british_auction')}
                    className="sr-only"
                  />
                  <div className={`block w-12 h-6 rounded-full transition-colors ${form.is_british_auction ? 'bg-brand-500' : 'bg-slate-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form.is_british_auction ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>

            {form.is_british_auction && (
              <div className="grid gap-6 sm:grid-cols-3 bg-brand-50/50 p-6 rounded-2xl border border-brand-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Trigger Window (min)</span>
                  <input
                    type="number"
                    value={form.trigger_window_minutes}
                    onChange={handleChange('trigger_window_minutes')}
                    min="0"
                    className="input-field bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Extension Duration (min)</span>
                  <input
                    type="number"
                    value={form.extension_duration_minutes}
                    onChange={handleChange('extension_duration_minutes')}
                    min="0"
                    className="input-field bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Extension Trigger</span>
                  <select
                    value={form.extension_trigger_type}
                    onChange={handleChange('extension_trigger_type')}
                    className="input-field bg-white cursor-pointer"
                  >
                    <option value="bid_received">Bid Received</option>
                    <option value="any_rank_change">Any Rank Change</option>
                    <option value="l1_rank_change">L1 Rank Change</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl p-4 flex items-start gap-3 border bg-red-50/80 border-red-200 text-red-800 animate-pulse">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto btn-primary py-4 px-10 text-lg flex justify-center items-center gap-3 float-right"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating RFQ...</span>
                </>
              ) : (
                <>
                  <span>Create RFQ</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
            <div className="clear-both"></div>
          </div>
        </form>
      </div>
    </div>
  )
}
