'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Circle, Globe, Eye, EyeOff } from 'lucide-react';
import { GithubLogo, GoogleLogo } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function AuthPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', frenixKey: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  // Redirect if already logged in
  useEffect(() => {
    const session = localStorage.getItem('filybase-auth-session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.accessToken && parsed.expiresAt) {
          // Only redirect if token hasn't expired
          const now = Math.floor(Date.now() / 1000);
          if (parsed.expiresAt > now) {
            router.replace('/dashboard');
            return;
          }
          // Token expired, clear it
          localStorage.removeItem('filybase-auth-session');
        }
      } catch {
        localStorage.removeItem('filybase-auth-session');
      }
    }
  }, [router]);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const projectId = 'test-project';
      if (mode === 'signup') {
        // Step 1: Verify Frenix key
        if (!form.frenixKey.trim()) {
          setError('Frenix API key is required to register.');
          return;
        }
        const verifyRes = await fetch('/api/platform/verify-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: form.frenixKey.trim() }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.valid) {
          setError(verifyData.error || 'Invalid Frenix key. Pro plan or higher required.');
          return;
        }

        // Step 2: Create account
        const res = await fetch(`/api/auth/${projectId}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, name: `${form.firstName} ${form.lastName}`.trim(), metadata: { frenixKey: form.frenixKey, frenixTier: verifyData.tier } }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error_description || data.error || 'Signup failed'); return; }
        localStorage.setItem('filybase-auth-session', JSON.stringify(data));
        localStorage.setItem('filybase-platform-session', JSON.stringify({ userId: data.user.id, email: data.user.email, projectId, projectName: 'My Project' }));
        window.location.href = '/dashboard';
      } else {
        const res = await fetch(`/api/auth/${projectId}/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error_description || data.error || 'Login failed'); return; }
        localStorage.setItem('filybase-auth-session', JSON.stringify(data));
        localStorage.setItem('filybase-platform-session', JSON.stringify({ userId: data.user.id, email: data.user.email, projectId, projectName: 'My Project' }));
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* Left Column - Hero */}
      <div className="relative hidden w-[52%] flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full lg:flex">
        <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4" type="video/mp4" />
        </video>

        <motion.div className="relative z-10 w-full max-w-xs space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <Circle className="w-5 h-5 fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight text-white">FilyBase</span>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="text-4xl font-medium tracking-tight text-white whitespace-nowrap">Join FilyBase</h1>
            <p className="text-white/60 text-sm leading-relaxed px-0">Follow these 3 quick phases to activate your space.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <StepItem number={1} text="Register your identity" active />
            <StepItem number={2} text="Configure your studio" />
            <StepItem number={3} text="Finalize your profile" />
          </motion.div>
        </motion.div>
      </div>

      {/* Right Column - Form */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden">
        <motion.div
          className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-medium tracking-tight text-white">{mode === 'signup' ? 'Create New Profile' : 'Welcome Back'}</h2>
            <p className="text-white/40 text-sm">{mode === 'signup' ? 'Input your basic details to begin the journey.' : 'Sign in to your account.'}</p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon={<GoogleLogo className="w-5 h-5" />} label="Google" />
            <SocialButton icon={<GithubLogo className="w-5 h-5" />} label="Github" />
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">Or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Form */}
          <div className="space-y-4">
            {mode === 'signup' && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="First Name" placeholder="John" value={form.firstName} onChange={v => setForm({ ...form, firstName: v })} />
                <InputGroup label="Last Name" placeholder="Doe" value={form.lastName} onChange={v => setForm({ ...form, lastName: v })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Frenix API Key</label>
                <input
                  type="text"
                  placeholder="Your Frenix Pro key"
                  value={form.frenixKey}
                  onChange={e => setForm({ ...form, frenixKey: e.target.value })}
                  className="w-full bg-[#1A1A1A] border-none rounded-xl h-11 px-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-shadow font-mono text-sm"
                />
                <p className="text-[11px] text-white/30">Pro plan or higher required. Get yours at <a href="https://frenix.sh" target="_blank" rel="noopener" className="text-white/50 underline">frenix.sh</a></p>
              </div>
              </>
            )}
            <InputGroup label="Email" placeholder="john@example.com" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#1A1A1A] border-none rounded-xl h-11 px-4 pr-11 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-shadow"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-white/30">Requires at least 8 symbols.</p>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">
              {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
              <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }} className="text-white/60 hover:text-white transition-colors underline underline-offset-2">
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
            <p className="text-[10px] text-white/20">Powered by <span className="text-white/40 font-medium">FilyAuth</span></p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function StepItem({ number, text, active = false }: { number: number; text: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-white text-black border border-white' : 'bg-[#1A1A1A] text-white border-none'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${active ? 'bg-black text-white' : 'bg-white/10 text-white/40'}`}>
        {number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-black' : 'text-white/70'}`}>{text}</span>
    </div>
  );
}

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center justify-center gap-2.5 h-12 bg-black border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/5 transition-colors">
      {icon}
      {label}
    </button>
  );
}

function InputGroup({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#1A1A1A] border-none rounded-xl h-11 px-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-shadow"
      />
    </div>
  );
}
