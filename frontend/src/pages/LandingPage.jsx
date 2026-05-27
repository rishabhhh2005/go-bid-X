import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import logo from "../assets/logo.png";
/* ─── Scroll-reveal hook ───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* direction: 'up' | 'left' | 'right' */
function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const [ref, inView] = useInView()
  const hidden =
    direction === 'up'    ? 'opacity-0 translate-y-5'  :
    direction === 'left'  ? 'opacity-0 -translate-x-5' :
                            'opacity-0 translate-x-5'
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out
        ${inView ? 'opacity-100 translate-y-0 translate-x-0' : hidden}
        ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ─── Data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    tag: 'For Buyers',
    title: 'Publish RFQs in under 2 minutes',
    desc: 'Structured forms guide you through route, cargo type, incoterms, and auction configuration. No email threads. No spreadsheets. Your requirements go live to qualified suppliers in seconds.',
    stat: '<2 min avg. publish time',
  },
  {
    tag: 'Auction Engine',
    title: 'British Auction keeps prices honest',
    desc: 'Dynamic extensions fire automatically when competitive bids arrive near the closing window — eliminating sniping and driving every auction to its true market floor.',
    stat: 'Avg. 3.2 extensions per auction',
  },
  {
    tag: 'Live Feed',
    title: 'WebSocket bid board',
    desc: 'L1 / L2 / L3 rankings update in real time. Buyers watch rates fall live. Suppliers see exactly where they stand.',
    stat: '<50ms latency on bid events',
  },
  {
    tag: 'Reliability',
    title: 'Every auction closes on time',
    desc: 'Hard deadlines and configurable max-extension limits mean no open-ended negotiations. Closure is enforced by the platform — not by you.',
    stat: '100% on-time closure rate',
  },
  {
    tag: 'Access Control',
    title: 'Role-specific dashboards',
    desc: 'Separate buyer and supplier portals with distinct permissions, views, and workflows. No information leakage between parties.',
    stat: 'Buyer & Supplier portals',
  },
  {
    tag: 'Compliance',
    title: 'Immutable audit trail',
    desc: 'Every bid, extension trigger, and closure event is time-stamped and stored. Full procurement compliance without manual record-keeping.',
    stat: '100% event coverage',
  },
]

const STEPS = [
  {
    num: '01',
    role: 'Buyer',
    title: 'Post an RFQ',
    desc: 'Define your freight requirements, route, cargo details, and auction rules. Publish to your supplier panel in under two minutes.',
  },
  {
    num: '02',
    role: 'Suppliers',
    title: 'Compete in real time',
    desc: 'Qualified suppliers submit competitive quotes. Rankings update instantly via WebSocket — no page refresh, no email ping-pong.',
  },
  {
    num: '03',
    role: 'System',
    title: 'Auction extends dynamically',
    desc: 'Late bids near the deadline trigger automatic time extensions. This is British Auction — sniping is eliminated by design.',
  },
  {
    num: '04',
    role: 'Buyer',
    title: 'Deal closes automatically',
    desc: 'At the hard deadline, the L1 supplier wins. Full audit trail preserved. No renegotiation, no ambiguity.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      "Before GoBidX, our freight procurement was 3–4 days of email back-and-forth. Now we have a live L1 rate within the hour. The British Auction format drives genuine competition — suppliers know they're being watched in real time.",
    name: 'Priya Sharma',
    role: 'Head of Logistics',
    company: 'NovaCargo',
    initials: 'PS',
    metric: '₹2.4Cr saved in 90 days',
  },
  {
    quote:
      'As a supplier, the live bid board changed how I think about quoting. I know exactly where I stand and can make strategic decisions instantly.',
    name: 'Arjun Mehta',
    role: 'Sales Director',
    company: 'SwiftFreight',
    initials: 'AM',
    metric: '3× more RFQ wins',
  },
  {
    quote:
      'The forced-closure guarantee was the deciding factor for our compliance team. Every auction closes on schedule. No exceptions, ever.',
    name: 'Lena Fischer',
    role: 'Procurement Manager',
    company: 'EuroLogix',
    initials: 'LF',
    metric: '100% on-time closure',
  },
]

/* ─── Star row helper ───────────────────────────────────────────────── */
function Stars({ size = 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`${cls} text-amber-400 fill-amber-400`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

/* ─── Avatar ────────────────────────────────────────────────────────── */
function Avatar({ initials, size = 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs'
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">

      {/* ══ NAVBAR ════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
         <div className="flex items-center gap-2.5">
  <img
    src={logo}
    alt="GoBidX"
    className="w-9 h-9 object-contain"
  />
  <span className="font-display font-bold text-lg text-slate-900 tracking-tight">
    GoBidX
  </span>
</div>

          {/* Center pills — decorative on desktop */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest select-none">
            <span>British Auction</span>
            <span className="text-slate-200">·</span>
            <span>Real-Time Bidding</span>
            <span className="text-slate-200">·</span>
            <span>Freight RFQ</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="relative pt-24 overflow-hidden bg-white">
        {/* Radial wash */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_55%_0%,rgba(99,102,241,0.07),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_500px] gap-12 lg:gap-16 items-end pt-16">

            {/* ── Left copy ── */}
            <div className="pb-20">

              {/* Eyebrow */}
              <div className="animate-fade-in mb-7">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-brand-600 tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  Freight RFQ · British Auction Platform
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display font-bold text-[3.25rem] sm:text-[3.75rem] lg:text-[4.25rem] text-slate-900 leading-[1.04] tracking-tight animate-slide-up">
                Freight pricing,<br />
                <span className="bg-gradient-to-r from-brand-500 to-blue-500 bg-clip-text text-transparent">
                  negotiated live.
                </span>
              </h1>

              {/* Description */}
              <p
                className="mt-5 text-lg text-slate-500 max-w-[440px] leading-relaxed animate-slide-up"
                style={{ animationDelay: '90ms' }}
              >
                GoBidX runs real-time reverse auctions for freight RFQs.
                Buyers capture L1 rates. Suppliers compete on a transparent, live bid board.
              </p>

              {/* CTAs */}
              <div
                className="mt-8 flex flex-col sm:flex-row items-start gap-3 animate-slide-up"
                style={{ animationDelay: '170ms' }}
              >
                <Link to="/register" className="btn-primary text-[15px] py-3 px-7 shadow-md shadow-brand-500/20">
                  Start for Free →
                </Link>
                <Link to="/login" className="btn-secondary text-[15px] py-3 px-7">
                  Sign In to Dashboard
                </Link>
              </div>

              <p
                className="mt-3.5 text-xs text-slate-400 animate-slide-up"
                style={{ animationDelay: '210ms' }}
              >
                No credit card required · Invite your suppliers in minutes
              </p>

              {/* Inline stats strip */}
              <div
                className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-3 gap-6 animate-slide-up"
                style={{ animationDelay: '270ms' }}
              >
                {[
                  { val: '40%', sub: 'avg. cost reduction' },
                  { val: '<2 min', sub: 'to publish an RFQ' },
                  { val: '100%', sub: 'on-time closure' },
                ].map((s) => (
                  <div key={s.sub}>
                    <p className="font-display font-bold text-[1.6rem] text-slate-900 leading-none">{s.val}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Bid board mockup ── */}
            <div
              className="relative lg:self-end animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              {/* Ambient glow */}
              <div className="absolute -inset-6 bg-brand-500/5 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative glass-panel overflow-hidden shadow-2xl shadow-slate-900/8 border border-slate-100/80">

                {/* Window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-white/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                  <span className="ml-3 text-[11px] text-slate-400 font-mono">GoBidX · Live Auction #1042</span>
                </div>

                <div className="p-5 space-y-3.5">

                  {/* Route header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Mumbai → Rotterdam
                      </p>
                      <p className="text-[13px] font-semibold text-slate-800">
                        FCL 40HC · 22 MT · Hazmat Class 3
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE · 04:32
                    </span>
                  </div>

                  {/* Extension alert */}
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5">
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <p className="text-[11px] font-bold text-amber-700">Extension triggered</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">L1 rank changed — +5 min added</p>
                    </div>
                  </div>

                  {/* Bid rows */}
                  <div className="space-y-1.5">
                    {[
                      { rank: 'L1', supplier: 'SwiftFreight', amount: '₹2,84,500', delta: '↓ ₹3,200', win: true },
                      { rank: 'L2', supplier: 'NovaCargo',    amount: '₹2,87,700', delta: '↓ ₹1,800', win: false },
                      { rank: 'L3', supplier: 'EuroLogix',    amount: '₹2,91,200', delta: '—',         win: false },
                    ].map((row) => (
                      <div
                        key={row.rank}
                        className={`flex items-center justify-between rounded-lg px-4 py-2.5
                          ${row.win
                            ? 'bg-brand-50 border border-brand-200'
                            : 'bg-white border border-slate-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded
                            ${row.win ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {row.rank}
                          </span>
                          <span className={`text-[13px] font-medium ${row.win ? 'text-slate-800' : 'text-slate-600'}`}>
                            {row.supplier}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`text-[13px] font-bold ${row.win ? 'text-brand-700' : 'text-slate-700'}`}>
                            {row.amount}
                          </p>
                          <p className={`text-[11px] ${row.win ? 'text-brand-400' : 'text-slate-400'}`}>
                            {row.delta}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Foot bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] text-slate-400">3 suppliers competing</span>
                    <span className="text-[11px] font-semibold text-brand-600">Closes in 04:32 →</span>
                  </div>
                </div>
              </div>

              {/* Floating savings badge */}
              <div className="absolute -right-3 top-1/3 hidden xl:block glass-panel px-3.5 py-2 shadow-lg shadow-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Avg savings / shipment</p>
                <p className="text-sm font-bold text-brand-600 mt-0.5">₹18,400 this week</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-slate-200">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-4">
                  Platform Capabilities
                </p>
                <h2 className="font-display font-bold text-4xl sm:text-[2.75rem] text-slate-900 tracking-tight leading-[1.1] max-w-lg">
                  Everything to run smarter<br />freight procurement
                </h2>
              </div>
              <p className="text-slate-500 text-base leading-relaxed max-w-xs lg:pb-1">
                Built for logistics teams that move fast and need procurement to match.
              </p>
            </div>
          </Reveal>

          {/* 2 hero feature panels */}
          <div className="grid lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden mt-px">
            {FEATURES.slice(0, 2).map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="bg-white p-8 lg:p-10 h-full hover:bg-slate-50/80 transition-colors duration-300">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-md mb-5">
                    {f.tag}
                  </span>
                  <h3 className="font-display font-semibold text-xl text-slate-900 mb-3 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
                    {f.desc}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 bg-slate-100 inline-block px-2.5 py-1 rounded-md">
                    {f.stat}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* 4 compact feature panels */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
            {FEATURES.slice(2).map((f, i) => (
              <Reveal key={f.title} delay={i * 55}>
                <div className="bg-white p-6 h-full hover:bg-slate-50/80 transition-colors duration-300">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3">
                    {f.tag}
                  </span>
                  <h3 className="font-display font-semibold text-[14px] text-slate-900 mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
                    {f.desc}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {f.stat}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-slate-900 overflow-hidden relative">
        {/* Subtle radial highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_0%,rgba(99,102,241,0.13),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-[360px_1fr] gap-16 lg:gap-24 items-start">

            {/* Left: sticky header */}
            <Reveal direction="left">
              <div className="lg:sticky lg:top-32">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-400 mb-5">
                  Workflow
                </p>
                <h2 className="font-display font-bold text-4xl sm:text-[2.75rem] text-white tracking-tight leading-[1.1]">
                  RFQ to deal<br />in four steps.
                </h2>
                <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
                  GoBidX handles the mechanics — you focus on making the right call.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Get started free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </Reveal>

            {/* Right: timeline rail */}
            <div className="relative">
              {/* Vertical connector */}
              <div className="absolute left-7 top-7 bottom-12 w-px bg-gradient-to-b from-brand-500 via-brand-500/40 to-transparent" />

              <div>
                {STEPS.map((step, i) => (
                  <Reveal key={step.num} delay={i * 110}>
                    <div className={`flex gap-7 ${i < STEPS.length - 1 ? 'pb-12' : ''}`}>

                      {/* Circle marker */}
                      <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-blue-600 flex flex-col items-center justify-center shadow-lg shadow-brand-500/30 z-10">
                        <span className="text-[9px] font-bold text-white/50 leading-none">{step.num}</span>
                        <span className="text-[10px] font-bold text-white leading-none mt-0.5">{step.role}</span>
                      </div>

                      {/* Content */}
                      <div className="pt-3">
                        <h3 className="font-display font-semibold text-[17px] text-white mb-2 leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-[13px] text-slate-400 leading-relaxed max-w-sm">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">

          <Reveal className="mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-3">
              What teams say
            </p>
            <h2 className="font-display font-bold text-4xl sm:text-[2.75rem] text-slate-900 tracking-tight leading-[1.1]">
              Buyers and suppliers,<br />both win.
            </h2>
          </Reveal>

          <div className="grid lg:grid-cols-[3fr_2fr] gap-5">

            {/* Featured testimonial */}
            <Reveal direction="left">
              <div className="glass-card p-8 lg:p-10 h-full flex flex-col">
                <Stars />

                <blockquote className="mt-6 text-[1.125rem] font-medium text-slate-800 leading-[1.7] flex-1">
                  "{TESTIMONIALS[0].quote}"
                </blockquote>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={TESTIMONIALS[0].initials} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{TESTIMONIALS[0].name}</p>
                      <p className="text-xs text-slate-500">{TESTIMONIALS[0].role} · {TESTIMONIALS[0].company}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">Impact</p>
                    <p className="text-sm font-bold text-brand-600">{TESTIMONIALS[0].metric}</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Two stacked cards */}
            <div className="flex flex-col gap-5">
              {TESTIMONIALS.slice(1).map((t, i) => (
                <Reveal key={t.name} direction="right" delay={(i + 1) * 90}>
                  <div className="glass-card p-6 flex flex-col h-full">
                    <Stars size="sm" />
                    <p className="mt-4 text-[13px] text-slate-600 leading-relaxed flex-1">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={t.initials} size="sm" />
                        <div>
                          <p className="text-[12px] font-semibold text-slate-800">{t.name}</p>
                          <p className="text-[11px] text-slate-400">{t.company}</p>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-brand-600 shrink-0">{t.metric}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="grid lg:grid-cols-[1fr_300px] gap-12 lg:gap-16 items-center bg-white border border-slate-200 rounded-3xl p-10 lg:p-14 shadow-sm shadow-slate-100">

              {/* Left: copy */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-4">
                  Ready to start?
                </p>
                <h2 className="font-display font-bold text-4xl sm:text-[2.75rem] text-slate-900 tracking-tight leading-[1.1] mb-5">
                  Stop leaving freight<br />savings on the table.
                </h2>
                <p className="text-slate-500 text-base leading-relaxed max-w-md">
                  Join logistics teams already using GoBidX to run live British Auctions and close better freight deals — consistently, automatically, on schedule.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link to="/register" className="btn-primary text-[15px] py-3 px-7">
                    Create Free Account →
                  </Link>
                  <Link to="/login" className="btn-secondary text-[15px] py-3 px-7">
                    Sign In
                  </Link>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  No credit card required · Invite your supplier panel free · Cancel anytime
                </p>
              </div>

              {/* Right: trust card */}
              <div className="glass-panel p-6 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">
                  Platform at a glance
                </p>
                <div className="space-y-3.5">
                  {[
                    { label: 'British Auction engine',  val: 'Live',     check: true },
                    { label: 'WebSocket bid board',     val: '<50ms',    check: true },
                    { label: 'Forced closure',          val: '100%',     check: true },
                    { label: 'Full audit trail',        val: 'Always on',check: true },
                    { label: 'Role-based access',       val: 'Included', check: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-[12px] text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 shrink-0">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="py-7 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-2">
  <img
    src={logo}
    alt="GoBidX"
    className="h-8 w-auto object-contain"
  />
  <span className="font-display font-bold text-slate-800 text-sm">
    GoBidX
  </span>
</div>

          <p className="text-[11px] text-slate-400">
            © 2026 GoBidX · British Auction RFQ Platform · Made by Rishabh Puri
          </p>

          <div className="flex items-center gap-5">
            <Link to="/login"    className="text-[12px] text-slate-500 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link to="/register" className="text-[12px] text-slate-500 hover:text-slate-900 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}