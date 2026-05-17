'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, X, Check } from '@phosphor-icons/react';

/**
 * OAuth Consent Page
 * 
 * When a third-party app initiates the OAuth flow, the user is redirected here.
 * They must be authenticated (have a valid session) and approve/deny the request.
 * 
 * Query params: ?project_id=...&client_id=...&redirect_uri=...&response_type=code&scope=...&state=...&code_challenge=...&code_challenge_method=S256
 */
export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121214] flex items-center justify-center text-white text-sm">Loading...</div>}>
      <OAuthConsentInner />
    </Suspense>
  );
}

function OAuthConsentInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'approved' | 'denied' | 'error'>('loading');
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('Unknown App');

  const projectId = searchParams.get('project_id') ?? '';
  const clientId = searchParams.get('client_id') ?? '';
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const responseType = searchParams.get('response_type') ?? 'code';
  const scope = searchParams.get('scope') ?? 'openid profile email';
  const state = searchParams.get('state') ?? '';
  const codeChallenge = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256';

  useEffect(() => {
    // In a real app, fetch client details to show the app name
    if (!projectId || !clientId || !redirectUri) {
      setError('Missing required parameters (project_id, client_id, redirect_uri).');
      setStatus('error');
      return;
    }
    setClientName(clientId); // Would fetch from /oauth/clients in production
    setStatus('ready');
  }, [projectId, clientId, redirectUri]);

  const handleApprove = async () => {
    // Get the user's access token from localStorage
    const sessionRaw = localStorage.getItem('filybase-auth-session');
    if (!sessionRaw) {
      setError('You must be signed in. Please sign in first.');
      setStatus('error');
      return;
    }
    const session = JSON.parse(sessionRaw);
    const accessToken = session.accessToken;

    const res = await fetch(`/api/auth/${projectId}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
        scope,
        state,
        code_challenge: codeChallenge || undefined,
        code_challenge_method: codeChallengeMethod || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setStatus('approved');
      // Redirect to the client's redirect_uri with the code
      window.location.href = data.redirectTo;
    } else {
      const err = await res.json().catch(() => ({ error_description: 'Authorization failed' }));
      setError(err.error_description || 'Authorization failed');
      setStatus('error');
    }
  };

  const handleDeny = () => {
    setStatus('denied');
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('error_description', 'The user denied the request.');
    if (state) url.searchParams.set('state', state);
    window.location.href = url.toString();
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#121214] flex items-center justify-center text-white text-sm">Loading...</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center p-6">
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-8 max-w-sm w-full text-center">
          <X size={32} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-base font-medium mb-2">Authorization Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] flex items-center justify-center p-6">
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-8 max-w-sm w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-full">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>
        </div>

        <h2 className="text-white text-base font-medium text-center mb-1">Authorize Application</h2>
        <p className="text-xs text-muted-foreground text-center mb-6">
          <span className="text-white font-medium">{clientName}</span> wants to access your account.
        </p>

        {/* Scopes */}
        <div className="bg-[#121214] border border-[#2c2c2e] rounded-lg p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-2">This app will be able to:</p>
          <div className="space-y-2">
            {scope.split(/\s+/).map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <Check size={12} className="text-emerald-400" />
                <span className="text-white">{scopeLabel(s)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Redirect info */}
        <p className="text-[10px] text-muted-foreground mb-6 text-center">
          Redirects to: <span className="font-mono">{new URL(redirectUri).origin}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleDeny} className="flex-1 py-2.5 bg-[#2c2c2e] text-white rounded-lg text-sm font-medium hover:bg-[#3c3c3e] transition-colors">
            Deny
          </button>
          <button onClick={handleApprove} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            Authorize
          </button>
        </div>
      </div>
    </div>
  );
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case 'openid': return 'Verify your identity';
    case 'profile': return 'Read your profile (name, avatar)';
    case 'email': return 'Read your email address';
    case 'phone': return 'Read your phone number';
    default: return scope;
  }
}
