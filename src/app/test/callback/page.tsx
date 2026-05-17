'use client';

import { useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDesc = params.get('error_description');

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6 font-mono">
      <div className="bg-[#111113] border border-zinc-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-base font-medium mb-4">OAuth Callback</h1>
        {error ? (
          <div className="space-y-2">
            <p className="text-red-400 text-sm">Error: {error}</p>
            {errorDesc && <p className="text-xs text-zinc-500">{errorDesc}</p>}
          </div>
        ) : code ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Authorization Code</p>
              <p className="text-xs text-emerald-400 break-all mt-1 bg-black/30 p-2 rounded">{code}</p>
            </div>
            {state && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">State</p>
                <p className="text-xs text-zinc-400 mt-1">{state}</p>
              </div>
            )}
            <p className="text-[10px] text-zinc-600 mt-4">Exchange this code at the /oauth/token endpoint to get access and refresh tokens.</p>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">No parameters received.</p>
        )}
        <a href="/test" className="inline-block mt-6 text-xs text-emerald-400 hover:underline">← Back to test console</a>
      </div>
    </div>
  );
}
