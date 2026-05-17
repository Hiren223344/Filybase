'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Check, X, ArrowClockwise } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

/**
 * /dashboard/pending
 * 
 * Shown to users after signup when POSTGRES_PROVIDER=render.
 * They wait here until admin approves their database request.
 * Polls every 10 seconds for status updates.
 */
export default function PendingPage() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_requested' | 'loading'>('loading');
  const [note, setNote] = useState('');
  const router = useRouter();

  const checkStatus = async () => {
    // Get user info from localStorage (set during signup)
    const sessionRaw = localStorage.getItem('filybase-platform-session');
    if (!sessionRaw) {
      setStatus('not_requested');
      return;
    }
    const session = JSON.parse(sessionRaw);
    const res = await fetch(`/api/admin/db-status?userId=${session.userId}&projectId=${session.projectId}`);
    if (res.ok) {
      const data = await res.json();
      
      // If local provider and not yet provisioned, auto-trigger it
      if (data.provider === 'local' && (data.status === 'not_requested' || data.autoProvision)) {
        await submitRequest();
        return;
      }
      
      setStatus(data.status);
      setNote(data.adminNote ?? '');
      if (data.status === 'approved') {
        localStorage.setItem('filybase-db-url', data.databaseUrl);
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const submitRequest = async () => {
    const sessionRaw = localStorage.getItem('filybase-platform-session');
    if (!sessionRaw) return;
    const session = JSON.parse(sessionRaw);
    
    // Use the unified provision endpoint — handles both local (auto) and render (manual)
    const res = await fetch('/api/admin/db-provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.userId,
        userEmail: session.email,
        projectId: session.projectId,
        projectName: session.projectName,
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'approved') {
        // Auto-provisioned (local mode) — go straight to dashboard
        localStorage.setItem('filybase-db-url', data.databaseUrl);
        setStatus('approved');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setStatus('pending');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-8 w-full max-w-md text-center space-y-6">
        
        {status === 'loading' && (
          <>
            <div className="animate-spin w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full mx-auto" />
            <p className="text-sm text-zinc-400">Checking status...</p>
          </>
        )}

        {status === 'not_requested' && (
          <>
            <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto">
              <Clock size={32} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-medium text-white">Database Setup Required</h2>
            <p className="text-sm text-zinc-400">Your project needs a PostgreSQL database. Click below to request provisioning from our team.</p>
            <button onClick={submitRequest} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Request Database
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="p-4 bg-yellow-500/10 rounded-full w-fit mx-auto">
              <Clock size={32} className="text-yellow-400" />
            </div>
            <h2 className="text-lg font-medium text-white">Please Wait</h2>
            <p className="text-sm text-zinc-400">Our team is reviewing your request. We&apos;ll provision a Render PostgreSQL database for your project shortly.</p>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <ArrowClockwise size={12} className="animate-spin" />
              Auto-checking every 10 seconds...
            </div>
            <div className="bg-[#121214] border border-[#2c2c2e] rounded-lg p-4 text-left">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">What happens next?</p>
              <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
                <li>Admin reviews your request</li>
                <li>A Render PostgreSQL instance is created for you</li>
                <li>You&apos;ll be automatically redirected to your dashboard</li>
              </ol>
            </div>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className="p-4 bg-emerald-500/10 rounded-full w-fit mx-auto">
              <Check size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-medium text-white">Database Provisioned!</h2>
            <p className="text-sm text-zinc-400">Your PostgreSQL database is ready. Redirecting to dashboard...</p>
            {note && <p className="text-xs text-zinc-500">Note: {note}</p>}
            <div className="animate-pulse text-xs text-emerald-400">Redirecting...</div>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto">
              <X size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-medium text-white">Request Declined</h2>
            <p className="text-sm text-zinc-400">Your database request was not approved.</p>
            {note && <p className="text-xs text-red-400/80 bg-red-400/5 p-3 rounded-lg">Reason: {note}</p>}
            <button onClick={submitRequest} className="px-6 py-2.5 bg-[#2c2c2e] text-white rounded-lg text-sm font-medium hover:bg-[#3c3c3e] transition-colors">
              Request Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
