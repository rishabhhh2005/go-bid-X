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
  carrier_name: '',
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
      setError('Unable to create RFQ. Verify your dates and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <SectionHeader
          title="New reverse auction"
          subtitle="Create an RFQ so suppliers can bid in real time."
          action={(
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to dashboard
            </button>
          )}
        />

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Reference ID</span>
              <input
                value={form.reference_id}
                onChange={handleChange('reference_id')}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">RFQ name</span>
              <input
                value={form.name}
                onChange={handleChange('name')}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Start time</span>
              <input
                type="datetime-local"
                value={form.bid_start_time}
                onChange={handleChange('bid_start_time')}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Close time</span>
              <input
                type="datetime-local"
                value={form.bid_close_time}
                onChange={handleChange('bid_close_time')}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Forced close</span>
              <input
                type="datetime-local"
                value={form.forced_bid_close_time}
                onChange={handleChange('forced_bid_close_time')}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Pickup / Service date</span>
              <input
                type="datetime-local"
                value={form.pickup_service_date}
                onChange={handleChange('pickup_service_date')}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Trigger window (min)</span>
              <input
                type="number"
                value={form.trigger_window_minutes}
                onChange={handleChange('trigger_window_minutes')}
                min="0"
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Extension duration (min)</span>
              <input
                type="number"
                value={form.extension_duration_minutes}
                onChange={handleChange('extension_duration_minutes')}
                min="0"
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Extension trigger</span>
              <select
                value={form.extension_trigger_type}
                onChange={handleChange('extension_trigger_type')}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="bid_received">Bid received</option>
                <option value="any_rank_change">Any rank change</option>
                <option value="l1_rank_change">L1 rank change</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-4 rounded-3xl bg-slate-50 px-5 py-4 text-slate-700">
            <input
              type="checkbox"
              checked={form.is_british_auction}
              onChange={handleChange('is_british_auction')}
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm">Enable British auction behavior</span>
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? 'Creating RFQ…' : 'Create RFQ'}
          </button>
        </form>
      </div>
    </div>
  )
}
