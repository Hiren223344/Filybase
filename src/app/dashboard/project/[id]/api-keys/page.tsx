'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash, Copy, Check, Eye, EyeSlash } from '@phosphor-icons/react';

interface ApiKey {
  id: string;
  key: string;
  tier: string;
  status: string;
  name: string;
  owner_id: string | null;
  created_at: number;
}

interface UsageStats {
  total: string;
  unique_nums: string;
  unique_keys?: string;
}

interface UsageLog {
  api_key: string;
  num: string;
  tier: string;
  ip: string;
  timestamp: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [tab, setTab] = useState<'keys' | 'usage'>('keys');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('free');
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => { loadKeys(); loadUsage(); }, []);

  const loadKeys = async () => {
    const res = await fetch('/api/osint/keys');
    if (res.ok) { const d = await res.json(); setKeys(d.keys ?? []); }
  };

  const loadUsage = async () => {
    const res = await fetch('/api/osint/usage?limit=50');
    if (res.ok) { const d = await res.json(); setLogs(d.logs ?? []); setStats(d.stats ?? null); }
  };

  const createKey = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/osint/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, tier: newTier }),
    });
    if (res.ok) { setCreating(false); setNewName(''); setNewTier('free'); await loadKeys(); }
  };

  const revokeKey = async (id: string) => {
    await fetch(`/api/osint/keys?id=${id}`, { method: 'DELETE' });
    await loadKeys();
  };

  const changeTier = async (id: string, tier: string) => {
    await fetch('/api/osint/keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tier }),
    });
    await loadKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const ago = (ts: number) => {
    const d = Date.now() - Number(ts);
    const m = Math.floor(d / 60000);
    if (m < 1) return 'now';
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  };

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage OSINT API keys and monitor usage.</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
          <Plus size={14} />New Key
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Lookups</p>
            <p className="text-xl font-medium mt-1 text-emerald-400">{stats.total}</p>
          </div>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Unique Numbers</p>
            <p className="text-xl font-medium mt-1 text-blue-400">{stats.unique_nums}</p>
          </div>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Active Keys</p>
            <p className="text-xl font-medium mt-1 text-purple-400">{keys.filter(k => k.status === 'active').length}</p>
          </div>
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCreating(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-base font-medium">Create API Key</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Key name (e.g. Production)" className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50" />
            <select value={newTier} onChange={e => setNewTier(e.target.value)} className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="free">Free (5 req/min)</option>
              <option value="pro">Pro (30 req/min)</option>
              <option value="enterprise">Enterprise (unlimited)</option>
            </select>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 bg-[#2c2c2e] rounded-lg text-sm hover:bg-[#3c3c3e] transition-colors">Cancel</button>
              <button onClick={createKey} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#2c2c2e] pb-px">
        <button onClick={() => setTab('keys')} className={`px-3 py-2 text-xs rounded-t transition-colors ${tab === 'keys' ? 'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-[#1c1c1e] -mb-px' : 'text-muted-foreground hover:text-white'}`}>Keys</button>
        <button onClick={() => setTab('usage')} className={`px-3 py-2 text-xs rounded-t transition-colors ${tab === 'usage' ? 'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-[#1c1c1e] -mb-px' : 'text-muted-foreground hover:text-white'}`}>Usage Logs</button>
      </div>

      {/* Keys tab */}
      {tab === 'keys' && (
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
          {keys.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No API keys yet. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-[#2c2c2e]">
              {keys.map(k => (
                <div key={k.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{k.name || 'Unnamed'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{k.status}</span>
                      <select value={k.tier} onChange={e => changeTier(k.id, e.target.value)} className="text-[10px] bg-[#2c2c2e] border-none rounded px-1.5 py-0.5 text-zinc-400 outline-none">
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[11px] font-mono text-zinc-500">
                        {revealed.has(k.id) ? k.key : k.key.slice(0, 8) + '•'.repeat(20)}
                      </code>
                      <button onClick={() => toggleReveal(k.id)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                        {revealed.has(k.id) ? <EyeSlash size={12} /> : <Eye size={12} />}
                      </button>
                      <button onClick={() => copyKey(k.key)} className="text-zinc-600 hover:text-emerald-400 transition-colors">
                        {copied === k.key ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{ago(k.created_at)}</span>
                    <button onClick={() => revokeKey(k.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors"><Trash size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Usage tab */}
      {tab === 'usage' && (
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No usage logs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2c2c2e]">
                    <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider">Key</th>
                    <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider">Number</th>
                    <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider">Tier</th>
                    <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider">IP</th>
                    <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="border-b border-[#2c2c2e]/50 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-zinc-500">{l.api_key.slice(0, 12)}...</td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{l.num}</td>
                      <td className="px-3 py-2"><span className="text-[10px] bg-[#2c2c2e] px-1.5 py-0.5 rounded">{l.tier}</span></td>
                      <td className="px-3 py-2 text-zinc-500">{l.ip}</td>
                      <td className="px-3 py-2 text-zinc-500">{ago(l.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API docs */}
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-5">
        <h3 className="text-sm font-medium mb-3">API Usage</h3>
        <pre className="text-xs font-mono text-emerald-400/90 bg-black/30 rounded-lg p-4 overflow-x-auto leading-relaxed">{`GET /api/osint/lookup?key=YOUR_API_KEY&num=+1234567890

# Or use header:
curl -H "x-api-key: YOUR_API_KEY" "/api/osint/lookup?num=+1234567890"

# Rate Limits:
# free: 5 req/min | pro: 30 req/min | enterprise: unlimited`}</pre>
      </div>
    </div>
  );
}
