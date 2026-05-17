'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp, ShoppingCart, Menu, TrendingDown, TrendingUp, X } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

// ─── CTA Button ──────────────────────────────────────────────────────────────

function CtaButton() {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="bg-neutral-900 text-white font-semibold cursor-pointer border-none text-[0.95rem] transition-all duration-200 hover:-translate-y-0.5"
      style={{ padding: '14px 32px', borderRadius: '12px', boxShadow: hover ? '0 14px 30px rgba(0,0,0,0.4)' : '0 10px 20px rgba(0,0,0,0.3)' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      Get Started Today
    </button>
  );
}

// ─── FAQ Accordion ───────────────────────────────────────────────────────────

const FAQ_DATA = [
  { q: "How does the 2GB storage quota work?", a: "Each project gets 2GB of PostgreSQL storage. When exceeded, write operations are blocked but reads always work. You can delete data or upgrade to continue writing." },
  { q: "Do I need to manage my own database?", a: "No. FilyBase handles all database provisioning, migrations, and connection pooling automatically. You just use the REST API or SQL editor." },
  { q: "Can I self-host FilyBase?", a: "Yes. FilyBase is a single Next.js app. Deploy it anywhere that runs Node.js — Vercel, Render, Railway, or your own VPS." },
  { q: "How does the OAuth 2.1 Server work?", a: "Your project acts as an identity provider. Third-party apps can implement 'Sign in with YourApp' using standard authorization code flow with PKCE." },
  { q: "What happens if I exceed rate limits?", a: "You'll receive an HTTP 429 response with a Retry-After header. Rate limits reset automatically. Upgrade to Pro for higher limits." },
];

function FaqAccordion() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const toggle = (i: number) => setActiveIndex(activeIndex === i ? null : i);

  return (
    <div className="flex flex-col justify-center gap-3">
      {FAQ_DATA.map((item, i) => {
        const active = activeIndex === i;
        return (
          <div
            key={i}
            onClick={() => toggle(i)}
            className="bg-white border rounded-[10px] py-[18px] px-5 cursor-pointer transition-all duration-200"
            style={{
              borderColor: active ? '#eaeaea' : '#f0f0f0',
              boxShadow: active ? '0 4px 12px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex justify-between items-center font-normal text-[0.9rem] text-neutral-900">
              <span>{item.q}</span>
              {active ? <ChevronUp size={20} className="shrink-0 ml-2 text-neutral-400" /> : <ChevronDown size={20} className="shrink-0 ml-2 text-neutral-400" />}
            </div>
            {active && (
              <p className="mt-3 text-[0.9rem] text-[#666] leading-[1.6]">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="relative w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl">
        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          autoPlay loop muted playsInline preload="auto"
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-white/10" />

        {/* Foreground */}
        <div className="relative z-10 flex flex-col h-full">
          <Navbar />

          {/* Hero Content */}
          <div className="flex flex-col items-center px-4 pt-10 sm:pt-16 pb-8 sm:pb-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 shadow-sm" style={{ fontSize: 13 }}>
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-neutral-800 font-medium">FilyBase</span>
            </div>

            <h1 className="mt-5 sm:mt-6 max-w-4xl text-neutral-900" style={{ fontSize: 'clamp(36px, 8vw, 72px)', lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Build{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>faster</span>
              <br />ship tomorrow
            </h1>

            <p className="mt-4 sm:mt-6 text-neutral-700 px-2" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
              The All-In-One Backend Platform for Auth, Database, Functions & OAuth
            </p>

            <Link href="/auth">
              <button className="mt-6 sm:mt-8 inline-flex items-center gap-3 bg-[#0b0f1a] text-white rounded-full pl-6 sm:pl-7 pr-2 py-2 sm:py-2.5" style={{ fontSize: 14 }}>
                Get Started
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-auto px-3 sm:px-4">
            <DashboardPreview />
          </div>
        </div>
      </div>

      {/* ─── White BG Sections ─────────────────────────────────────────────── */}

      {/* Features */}
      <section className="bg-white py-20 sm:py-28 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={6} textClassName="text-neutral-900 tracking-tight">
            Everything you need to ship fast and scale without limits
          </ScrollReveal>
          <p className="text-neutral-500 mt-4 text-sm sm:text-base max-w-lg mx-auto">A complete backend platform. Auth, Database, Functions, OAuth — all from one place.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Authentication', desc: 'Email/password, magic links, MFA, OAuth providers. Full session management out of the box.' },
            { title: 'PostgreSQL Database', desc: 'REST API with PostgREST-style filters. Raw SQL access. 2GB free storage per project.' },
            { title: 'Edge Functions', desc: 'Write JavaScript, deploy instantly. Invoke via HTTP. 10s timeout, sandboxed execution.' },
            { title: 'OAuth 2.1 Server', desc: 'Your project as an identity provider. Authorization code + PKCE. OpenID Connect.' },
            { title: 'API Key Management', desc: 'Tier-based rate limiting. Usage tracking. Create, revoke, and monitor keys.' },
            { title: 'Admin Panel', desc: 'Manage users, sessions, audit logs, hooks, and database provisioning from one interface.' },
          ].map((f, i) => (
            <div key={i} className="border border-neutral-200 rounded-2xl p-6 hover:border-[#10b981]/40 transition-colors">
              <h3 className="text-base font-medium text-neutral-900 mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 sm:py-28 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={5} blurStrength={8} textClassName="text-neutral-900 tracking-tight">
            Start building in three simple steps from zero to production
          </ScrollReveal>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { step: '01', title: 'Create a project', desc: 'Sign up and get a database, auth system, and function runtime instantly.' },
            { step: '02', title: 'Build your app', desc: 'Use the REST API, Client SDK, or SQL editor. Connect from any framework.' },
            { step: '03', title: 'Ship to production', desc: 'Deploy anywhere. Security, rate limiting, and monitoring are built in.' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <span className="text-[#10b981] text-xs font-mono font-semibold">{s.step}</span>
              <h3 className="text-lg font-medium text-neutral-900 mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[{ value: '99.99%', label: 'Uptime' },{ value: '<15ms', label: 'Latency' },{ value: '2GB', label: 'Free Storage' },{ value: '∞', label: 'API Requests' }].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-medium text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-20 sm:py-28 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={6} textClassName="text-neutral-900 tracking-tight">
            Simple transparent pricing that scales with your growth
          </ScrollReveal>
          <p className="text-neutral-500 mt-3 text-sm">Start free. Scale when ready.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Free', price: '$0', features: ['2 GB Database','50K Auth Users','Edge Functions','OAuth Server','Community Support'], highlight: false },
            { name: 'Pro', price: '$25', features: ['10 GB Database','Unlimited Users','Custom Domains','Priority Support','Advanced Analytics'], highlight: true },
            { name: 'Enterprise', price: 'Custom', features: ['Unlimited Storage','Dedicated Instance','99.99% SLA','SSO / SAML','Dedicated Support'], highlight: false },
          ].map((p, i) => (
            <div key={i} className={`rounded-2xl p-6 border ${p.highlight ? 'border-[#10b981] shadow-sm' : 'border-neutral-200'}`}>
              <h3 className="text-lg font-medium text-neutral-900">{p.name}</h3>
              <p className="mt-2 mb-6"><span className="text-3xl font-medium text-neutral-900">{p.price}</span>{p.price !== 'Custom' && <span className="text-sm text-neutral-400">/mo</span>}</p>
              <ul className="space-y-2.5 mb-6">
                {p.features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-neutral-600"><svg className="w-4 h-4 text-[#10b981] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{f}</li>)}
              </ul>
              <Link href="/auth"><button className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${p.highlight ? 'bg-[#10b981] text-white hover:bg-[#0d9668]' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>{p.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}</button></Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 sm:py-28 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <ScrollReveal baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={6} textClassName="text-neutral-900 tracking-tight">
            Loved by developers who ship products every day
          </ScrollReveal>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: 'FilyBase replaced 4 services for us. Auth, database, functions — one clean API.', name: 'Alex Chen', role: 'CTO, Nexora' },
            { quote: 'The OAuth server saved us weeks. "Sign in with our app" running in an afternoon.', name: 'Sarah Kim', role: 'Lead Engineer, Vortex' },
            { quote: 'Self-hosted, no vendor lock-in, better DX than the big cloud providers.', name: 'Marcus Rivera', role: 'Founder, Stackline' },
          ].map((t, i) => (
            <div key={i} className="border border-neutral-200 rounded-2xl p-6">
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-sm font-medium text-neutral-900">{t.name}</p>
              <p className="text-xs text-neutral-400">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA + FAQ */}
      <section className="bg-white py-20 px-4 rounded-2xl sm:rounded-3xl mt-3 sm:mt-4">
        <div className="max-w-[1100px] w-full mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-stretch">
            {/* Left - Animated CTA */}
            <div className="c5-animated-gradient rounded-[24px] py-20 px-10 text-white flex flex-col justify-center items-center text-center" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <h2 className="font-normal leading-[1.1] mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.03em' }}>
                Ready to Build<br/>Without Limits?
              </h2>
              <p className="text-[0.9rem] mb-8 font-normal opacity-85">Ship your backend in minutes, not months.</p>
              <Link href="/auth">
                <CtaButton />
              </Link>
            </div>

            {/* Right - FAQ */}
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full mt-3 sm:mt-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="bg-[#E9EBEE] rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-white rounded-[40px] m-2 shadow-sm">
              <div className="p-8 md:p-10 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
                {/* Brand */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="FilyBase" className="h-8 w-auto" />
                    <span className="text-[26px] font-bold tracking-tight text-[#0F172A]">FilyBase</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed text-[16px] font-normal max-w-[320px]">Open-source backend platform with Auth, Database, Edge Functions, and OAuth Server — all in one place.</p>
                  <div className="flex gap-3">
                    {['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z', 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2z M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01'].map((path, i) => (
                      <button key={i} className="w-[44px] h-[44px] flex items-center justify-center rounded-xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-all active:scale-95">
                        <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={path}/></svg>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Product */}
                <div className="space-y-6">
                  <h4 className="text-[14px] font-medium text-[#94A3B8]">Product</h4>
                  <ul className="space-y-4">{['Authentication','Database','Edge Functions','OAuth Server'].map(l=><li key={l}><Link href="/docs" className="text-[15px] font-medium text-[#1E293B] hover:text-[#10b981] transition-colors">{l}</Link></li>)}</ul>
                </div>
                {/* Developers */}
                <div className="space-y-6">
                  <h4 className="text-[14px] font-medium text-[#94A3B8]">Developers</h4>
                  <ul className="space-y-4">{['Documentation','Client SDK','API Reference','Self-Hosting'].map(l=><li key={l}><Link href="/docs" className="text-[15px] font-medium text-[#1E293B] hover:text-[#10b981] transition-colors">{l}</Link></li>)}</ul>
                </div>
                {/* Company */}
                <div className="space-y-6">
                  <h4 className="text-[14px] font-medium text-[#94A3B8]">Company</h4>
                  <ul className="space-y-4">{['About Us','Open Source','Careers'].map(l=><li key={l}><span className="text-[15px] font-medium text-[#1E293B] hover:text-[#10b981] transition-colors cursor-pointer">{l}</span></li>)}</ul>
                </div>
              </div>
            </div>
            {/* Bottom bar */}
            <div className="px-6 sm:px-12 md:px-16 lg:px-20 py-5 flex flex-col md:flex-row justify-between items-center gap-6 text-[15px]">
              <p className="text-[#64748B] font-medium">© 2026 FilyBase Labs. All rights reserved.</p>
              <div className="flex gap-8 text-[#64748B] font-medium items-center">
                <a href="#" className="hover:text-[#1E293B] transition-colors">Privacy</a>
                <div className="w-[1px] h-4 bg-slate-300" />
                <a href="#" className="hover:text-[#1E293B] transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </div>

        {/* Glass Text */}
        <div className="relative w-full flex items-center justify-center select-none pt-0 overflow-hidden">
          <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
            <defs>
              <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.25" result="outer-shadow"/>
                <feComponentTransfer in="SourceAlpha" result="alpha"><feFuncA type="linear" slope="1"/></feComponentTransfer>
                <feOffset in="alpha" dx="0" dy="4" result="offset-white"/>
                <feGaussianBlur in="offset-white" stdDeviation="4" result="blur-white"/>
                <feComposite in="alpha" in2="blur-white" operator="out" result="inner-white-mask"/>
                <feFlood floodColor="#ffffff" floodOpacity="0.25" result="white-fill"/>
                <feComposite in="white-fill" in2="inner-white-mask" operator="in" result="inner-white-final"/>
                <feGaussianBlur in="alpha" stdDeviation="6" result="blur-black"/>
                <feComposite in="alpha" in2="blur-black" operator="out" result="inner-black-mask"/>
                <feFlood floodColor="#000000" floodOpacity="0.25" result="black-fill"/>
                <feComposite in="black-fill" in2="inner-black-mask" operator="in" result="inner-black-final"/>
                <feMerge><feMergeNode in="outer-shadow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="inner-white-final"/><feMergeNode in="inner-black-final"/></feMerge>
              </filter>
            </defs>
          </svg>
          <h1 className="text-[min(25vw,400px)] font-bold tracking-normal leading-none select-none text-white/[0.08] px-4" style={{ filter: 'url(#glass-effect)' }}>
            FilyBase
          </h1>
        </div>
      </footer>
    </div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-center pt-4 sm:pt-6 px-3 sm:px-4">
      <div className="bg-white rounded-full shadow-sm border border-neutral-200 pl-2 pr-2 py-2 w-full max-w-[760px] relative flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <img src="/logo.png" alt="FilyBase" className="h-7 sm:h-8 w-auto" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6" style={{ fontSize: 14 }}>
          <span className="flex items-center gap-1.5 text-neutral-900 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-black" />Home
          </span>
          <span className="text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors">Features</span>
          <span className="text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors">Docs</span>
          <span className="flex items-center gap-0.5 text-[#10b981] cursor-pointer">
            Pages <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-neutral-500 hidden sm:block cursor-pointer" />
          <Link href="/dashboard">
            <button className="bg-[#10b981] text-white rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-[#0d9668] transition-colors">
              <span className="hidden sm:inline">Get early access</span>
              <span className="sm:hidden">Early access</span>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          </Link>
          <button className="md:hidden p-1.5" onClick={() => setOpen(!open)}>
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="absolute top-full left-2 right-2 mt-2 bg-white rounded-2xl shadow-lg border border-neutral-200 p-3 z-20 md:hidden">
            {['Home', 'Features', 'Docs', 'Pages'].map(item => (
              <div key={item} className="px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg cursor-pointer">{item}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Preview ───────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="bg-[#f5f2ee] rounded-3xl p-4 sm:p-6 w-full max-w-[880px] mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1 - Clicks */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13 }}>
            <span className="text-[#10b981] font-medium">Clicks</span>
            <span className="text-neutral-400">This Month</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 28, fontWeight: 600 }}>6,896</span>
            <span className="bg-red-50 text-red-600 rounded-full px-2 py-0.5 flex items-center gap-1" style={{ fontSize: 11 }}>
              <TrendingDown className="w-3 h-3" />-3,382 (33%)
            </span>
          </div>
          <p className="text-neutral-400 mb-4" style={{ fontSize: 11 }}>Compared to yesterday</p>
          <p className="text-center text-neutral-500 mb-2" style={{ fontSize: 11 }}>Month Target achieved</p>
          <Gauge value={92} color="#10b981" showLabels min="389K" max="425K" />
          <div className="bg-neutral-100 rounded-full p-1 flex mt-4">
            <span className="flex-1 text-center py-1.5 bg-white rounded-full shadow-sm text-xs font-medium">Impressions</span>
            <span className="flex-1 text-center py-1.5 text-xs text-neutral-500">Clicks</span>
          </div>
        </div>

        {/* Card 2 - Form */}
        <div className="bg-white rounded-2xl p-5 flex flex-col gap-3">
          <div>
            <label className="text-neutral-700 block mb-1" style={{ fontSize: 12 }}>Show figures for</label>
            <button className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-left text-sm flex items-center justify-between">
              This month <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>
          <div>
            <label className="text-neutral-700 block mb-1" style={{ fontSize: 12 }}>Compare period by</label>
            <button className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-left text-sm flex items-center justify-between">
              Month-to-date (MTD) <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>
          <div>
            <label className="text-neutral-700 block mb-1" style={{ fontSize: 12 }}>Ste targets (This month)</label>
            <div className="flex items-center border border-neutral-200 rounded-lg px-3 py-2">
              <span className="text-neutral-400 text-sm mr-1">#</span>
              <span className="text-sm">10</span>
            </div>
          </div>
          <div>
            <label className="text-neutral-700 block mb-1" style={{ fontSize: 12 }}>Ste targets (This year)</label>
            <div className="flex items-center border border-neutral-200 rounded-lg px-3 py-2">
              <span className="text-neutral-400 text-sm mr-1">#</span>
              <span className="text-sm">100</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-auto pt-2">
            <button className="bg-[#10b981] text-white rounded-lg px-5 py-2 text-sm font-medium">Save</button>
            <span className="text-sm text-neutral-600 underline cursor-pointer">Cancel</span>
            <X className="w-4 h-4 text-neutral-400 ml-auto cursor-pointer" />
          </div>
        </div>

        {/* Card 3 - Video Starts */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13 }}>
            <span className="text-[#10b981] font-medium">Video Starts</span>
            <span className="text-neutral-400">today</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 28, fontWeight: 600 }}>0</span>
            <span className="bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 flex items-center gap-1" style={{ fontSize: 11 }}>
              <TrendingUp className="w-3 h-3" />0
            </span>
          </div>
          <p className="text-neutral-400 mb-4" style={{ fontSize: 11 }}>Compared to yesterday</p>
          <Gauge value={68} color="#9ca3af" />
          <div className="bg-neutral-100 rounded-full p-1 flex mt-4">
            <span className="flex-1 text-center py-1.5 bg-white rounded-full shadow-sm text-xs font-medium">Video Clicks</span>
            <span className="flex-1 text-center py-1.5 text-xs text-neutral-500">Video Starts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gauge ───────────────────────────────────────────────────────────────────

function Gauge({ value, color = '#10b981', showLabels, min, max }: { value: number; color?: string; showLabels?: boolean; min?: string; max?: string }) {
  const totalTicks = 40;
  const activeTicks = Math.round((value / 100) * totalTicks);
  const r = 80;
  const cx = 100;
  const cy = 100;

  // Pre-compute tick positions to fixed precision to avoid hydration mismatch
  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    const angle = Math.PI + (i / (totalTicks - 1)) * Math.PI;
    return {
      x1: Number((cx + (r - 10) * Math.cos(angle)).toFixed(4)),
      y1: Number((cy + (r - 10) * Math.sin(angle)).toFixed(4)),
      x2: Number((cx + r * Math.cos(angle)).toFixed(4)),
      y2: Number((cy + r * Math.sin(angle)).toFixed(4)),
      active: i < activeTicks,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" suppressHydrationWarning>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.active ? color : '#d4d4d8'} strokeWidth={2.5} strokeLinecap="round" />
        ))}
        <text x={100} y={105} textAnchor="middle" fill={color} style={{ fontSize: 22, fontWeight: 600 }}>{value}%</text>
      </svg>
      {showLabels && min && max && (
        <div className="flex justify-between w-full max-w-[260px] px-2" style={{ fontSize: 11, color: '#737373' }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}
