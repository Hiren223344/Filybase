'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Lightning, Plus, Play, Trash, Copy, Check } from '@phosphor-icons/react';

interface EdgeFunction {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: string;
  created_at: number;
  updated_at: number;
  invoke_count: number;
}

export default function FunctionsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [functions, setFunctions] = useState<EdgeFunction[]>([]);
  const [selected, setSelected] = useState<EdgeFunction | null>(null);
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = `/api/functions/${projectId}`;

  useEffect(() => { loadFunctions(); }, [projectId]);

  const loadFunctions = async () => {
    const res = await fetch(base);
    if (res.ok) { const d = await res.json(); setFunctions(d.functions ?? []); }
  };

  const createFunction = async () => {
    if (!newName.trim()) return;
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName('');
      setCreating(false);
      await loadFunctions();
    }
  };

  const selectFunction = async (fn: EdgeFunction) => {
    const res = await fetch(`${base}/${fn.id}`);
    if (res.ok) {
      const full = await res.json();
      setSelected(full);
      setCode(full.code);
      setInvokeResult(null);
    }
  };

  const saveCode = async () => {
    if (!selected) return;
    await fetch(`${base}/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    await loadFunctions();
  };

  const deleteFunction = async (id: string) => {
    await fetch(`${base}?id=${id}`, { method: 'DELETE' });
    if (selected?.id === id) { setSelected(null); setCode(''); }
    await loadFunctions();
  };

  const invokeFunction = async () => {
    if (!selected) return;
    setInvoking(true);
    setInvokeResult(null);
    try {
      const res = await fetch(`${base}/invoke/${selected.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: Date.now() }),
      });
      const text = await res.text();
      const duration = res.headers.get('x-function-duration') ?? '?';
      try {
        const json = JSON.parse(text);
        setInvokeResult(`${res.status} · ${duration}\n${JSON.stringify(json, null, 2)}`);
      } catch {
        setInvokeResult(`${res.status} · ${duration}\n${text}`);
      }
    } catch (err: any) {
      setInvokeResult(`Error: ${err.message}`);
    }
    setInvoking(false);
    await loadFunctions();
  };

  const invokeUrl = selected ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/functions/${projectId}/invoke/${selected.slug}` : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(invokeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Edge Functions</h1>
          <p className="text-muted-foreground text-sm mt-1">Deploy serverless functions that run on every request.</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
          <Plus size={14} />New Function
        </button>
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCreating(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-base font-medium">New Edge Function</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Function name (e.g. send-email)" className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50" onKeyDown={e => e.key === 'Enter' && createFunction()} />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 bg-[#2c2c2e] rounded-lg text-sm hover:bg-[#3c3c3e] transition-colors">Cancel</button>
              <button onClick={createFunction} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[240px_1fr] gap-4 min-h-[600px]">
        {/* Function list */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Functions ({functions.length})</p>
          {functions.length === 0 && <p className="text-xs text-muted-foreground">No functions yet.</p>}
          {functions.map(fn => (
            <div key={fn.id} className={`flex items-center justify-between px-2 py-2 rounded cursor-pointer transition-colors ${selected?.id === fn.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-[#2c2c2e]'}`}>
              <button onClick={() => selectFunction(fn)} className="flex items-center gap-2 text-xs text-left flex-1 truncate">
                <Lightning size={12} weight="fill" />
                <span className="truncate">{fn.name}</span>
              </button>
              <button onClick={() => deleteFunction(fn.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors"><Trash size={12} /></button>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="space-y-4">
          {!selected ? (
            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-12 text-center text-muted-foreground text-sm">
              Select a function or create a new one.
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{invokeUrl}</span>
                    <button onClick={copyUrl} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{selected.invoke_count} invocations</span>
                  <button onClick={invokeFunction} disabled={invoking} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    <Play size={10} weight="fill" />{invoking ? 'Running...' : 'Invoke'}
                  </button>
                </div>
              </div>

              {/* Code editor */}
              <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#2c2c2e]">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">index.js</span>
                  <button onClick={saveCode} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Save (Ctrl+S)</button>
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCode(); } }}
                  className="w-full bg-transparent p-4 text-sm font-mono text-zinc-300 outline-none resize-y min-h-[300px]"
                  spellCheck={false}
                />
              </div>

              {/* Invoke result */}
              {invokeResult && (
                <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#2c2c2e]">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Response</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap">{invokeResult}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
