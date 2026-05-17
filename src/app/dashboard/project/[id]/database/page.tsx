'use client';

import React, { useState, useEffect } from 'react';
import { Play, Table, ArrowClockwise } from '@phosphor-icons/react';

interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: { name: string; dataTypeID: number }[];
  duration: number;
  error?: string;
}

interface TableInfo {
  table_name: string;
  table_schema: string;
}

export default function DatabasePage() {
  const [tab, setTab] = useState<'editor' | 'tables'>('editor');
  const [sql, setSql] = useState('SELECT * FROM auth_users LIMIT 20;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [quota, setQuota] = useState<{ maxBytes: number; usedBytes: number; percentUsed: number; usedFormatted: string; remainingFormatted: string; exceeded: boolean } | null>(null);

  useEffect(() => {
    // In dev, use the default secret; in prod user must provide it
    const stored = typeof window !== 'undefined' ? localStorage.getItem('fb-admin-secret') : null;
    if (stored) setAdminSecret(stored);
    else setAdminSecret('dev-admin-secret-change-in-prod');
  }, []);

  useEffect(() => {
    if (adminSecret) { fetchTables(); fetchQuota(); }
  }, [adminSecret]);

  const fetchQuota = async () => {
    const res = await fetch('/api/db/quota', { headers: { 'x-admin-secret': adminSecret } });
    if (res.ok) { const d = await res.json(); setQuota(d.quota); }
  };

  const fetchTables = async () => {
    const res = await fetch('/api/db/tables', { headers: { 'x-admin-secret': adminSecret } });
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables ?? []);
    }
  };

  const runQuery = async (query?: string) => {
    const q = query ?? sql;
    if (!q.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ sql: q }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ rows: [], rowCount: 0, fields: [], duration: 0, error: data.error });
      else setResult(data);
    } catch (err: any) {
      setResult({ rows: [], rowCount: 0, fields: [], duration: 0, error: err.message });
    }
    setRunning(false);
  };

  const viewTable = async (name: string) => {
    setSelectedTable(name);
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
      body: JSON.stringify({ sql: `SELECT * FROM "${name}" LIMIT 100` }),
    });
    if (res.ok) setTableData(await res.json());
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Database</h1>
          <p className="text-muted-foreground text-sm mt-1">SQL editor and table browser.</p>
        </div>
        <button onClick={() => { fetchTables(); fetchQuota(); }} className="p-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg hover:bg-[#2c2c2e] transition-colors">
          <ArrowClockwise size={16} />
        </button>
      </div>

      {/* Storage Quota */}
      {quota && (
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Storage: {quota.usedFormatted} / 2 GB</span>
            <span className="text-xs text-muted-foreground">{quota.remainingFormatted} remaining</span>
          </div>
          <div className="w-full h-2 bg-[#2c2c2e] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${quota.percentUsed > 90 ? 'bg-red-500' : quota.percentUsed > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(quota.percentUsed, 100)}%` }} />
          </div>
          {quota.exceeded && <p className="text-[10px] text-red-400 mt-2">Storage quota exceeded. Delete data or upgrade to continue writing.</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#2c2c2e] pb-px">
        <button onClick={() => setTab('editor')} className={`px-3 py-2 text-xs rounded-t transition-colors ${tab === 'editor' ? 'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-[#1c1c1e] -mb-px' : 'text-muted-foreground hover:text-white'}`}>SQL Editor</button>
        <button onClick={() => setTab('tables')} className={`px-3 py-2 text-xs rounded-t transition-colors ${tab === 'tables' ? 'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-[#1c1c1e] -mb-px' : 'text-muted-foreground hover:text-white'}`}>Table Editor</button>
      </div>

      {tab === 'editor' && (
        <div className="space-y-4">
          {/* SQL Input */}
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2c2c2e]">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Query</span>
              <button
                onClick={() => runQuery()}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Play size={12} weight="fill" />
                {running ? 'Running...' : 'Run'}
              </button>
            </div>
            <textarea
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuery(); }}
              className="w-full bg-transparent p-4 text-sm font-mono text-emerald-400 outline-none resize-y min-h-[120px]"
              placeholder="SELECT * FROM auth_users;"
              spellCheck={false}
            />
          </div>

          {/* Results */}
          {result && (
            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-[#2c2c2e] flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {result.error ? 'Error' : `${result.rowCount ?? result.rows.length} rows · ${result.duration}ms`}
                </span>
              </div>
              {result.error ? (
                <div className="p-4 text-sm text-red-400 font-mono">{result.error}</div>
              ) : result.rows.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No rows returned.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#2c2c2e]">
                        {result.fields.map(f => (
                          <th key={f.name} className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">{f.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="border-b border-[#2c2c2e]/50 hover:bg-white/[0.02]">
                          {result.fields.map(f => (
                            <td key={f.name} className="px-3 py-2 font-mono text-zinc-300 whitespace-nowrap max-w-[300px] truncate">
                              {row[f.name] === null ? <span className="text-zinc-600">NULL</span> : typeof row[f.name] === 'object' ? JSON.stringify(row[f.name]) : String(row[f.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'tables' && (
        <div className="grid grid-cols-[200px_1fr] gap-4 min-h-[500px]">
          {/* Table list */}
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-3 space-y-1 overflow-y-auto">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tables</p>
            {tables.length === 0 && <p className="text-xs text-muted-foreground">No tables found.</p>}
            {tables.map(t => (
              <button
                key={`${t.table_schema}.${t.table_name}`}
                onClick={() => viewTable(t.table_name)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${selectedTable === t.table_name ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-[#2c2c2e]'}`}
              >
                <Table size={12} />
                <span className="truncate">{t.table_name}</span>
              </button>
            ))}
          </div>

          {/* Table data */}
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg overflow-hidden">
            {!selectedTable ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Select a table to view its data.</div>
            ) : !tableData ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : tableData.error ? (
              <div className="p-4 text-red-400 text-sm font-mono">{tableData.error}</div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-[#2c2c2e] flex items-center justify-between">
                  <span className="text-xs font-medium">{selectedTable}</span>
                  <span className="text-[10px] text-muted-foreground">{tableData.rows.length} rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#2c2c2e]">
                        {tableData.fields.map(f => (
                          <th key={f.name} className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">{f.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, i) => (
                        <tr key={i} className="border-b border-[#2c2c2e]/50 hover:bg-white/[0.02]">
                          {tableData.fields.map(f => (
                            <td key={f.name} className="px-3 py-2 font-mono text-zinc-300 whitespace-nowrap max-w-[250px] truncate">
                              {row[f.name] === null ? <span className="text-zinc-600">NULL</span> : typeof row[f.name] === 'object' ? JSON.stringify(row[f.name]) : String(row[f.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
