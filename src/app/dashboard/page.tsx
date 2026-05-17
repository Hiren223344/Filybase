'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MagnifyingGlass, SignOut, Gear, Database } from '@phosphor-icons/react';

interface Project {
  id: string;
  name: string;
  region: string;
  created_at: number;
}

interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  postgres_url: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [pgUrl, setPgUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const sessionRaw = localStorage.getItem('filybase-auth-session');
    if (!sessionRaw) { router.push('/auth'); return; }
    try {
      const session = JSON.parse(sessionRaw);
      const now = Math.floor(Date.now() / 1000);
      if (!session.accessToken || (session.expiresAt && session.expiresAt < now)) {
        localStorage.removeItem('filybase-auth-session');
        router.push('/auth');
        return;
      }
      setUser({ id: session.user?.id ?? '', email: session.user?.email ?? '', name: session.user?.name ?? null, role: 'authenticated', status: 'approved', postgres_url: null });
      loadProjects();
    } catch {
      localStorage.removeItem('filybase-auth-session');
      router.push('/auth');
    }
  }, []);

  const loadProjects = async (token?: string) => {
    const sessionRaw = localStorage.getItem('filybase-auth-session');
    if (!sessionRaw) return;
    const session = JSON.parse(sessionRaw);
    const userId = session.user?.id;
    if (!userId) return;
    const res = await fetch('/api/platform/projects', { headers: { 'x-user-id': userId } });
    if (res.ok) { const d = await res.json(); setProjects(d.projects ?? []); }
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    const sessionRaw = localStorage.getItem('filybase-auth-session');
    if (!sessionRaw) return;
    const session = JSON.parse(sessionRaw);
    const userId = session.user?.id;
    if (!userId) return;
    const res = await fetch('/api/platform/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setCreating(false); setNewName(''); await loadProjects(); }
  };

  const savePostgres = async () => {
    const token = localStorage.getItem('fb-token');
    await fetch('/api/platform/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postgres_url: pgUrl }),
    });
    if (user) {
      const updated = { ...user, postgres_url: pgUrl };
      setUser(updated);
      localStorage.setItem('fb-user', JSON.stringify(updated));
    }
    setShowDbSetup(false);
  };

  const signOut = () => {
    localStorage.removeItem('filybase-auth-session');
    localStorage.removeItem('filybase-platform-session');
    router.push('/auth');
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#121214] text-white">
      {/* Nav */}
      <nav className="border-b border-[#2c2c2e] bg-[#1c1c1e] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
          <span className="text-sm font-medium">FilyBase</span>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-400">{user.name || user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={signOut} className="p-2 text-muted-foreground hover:text-white transition-colors" title="Sign Out">
            <SignOut size={16} />
          </button>
        </div>
      </nav>

      <div className="max-w-[1000px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={14} />New Project
          </button>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/dashboard/project/${p.id}`}>
              <div className="bg-[#1c1c1e] border border-[#2c2c2e] hover:border-emerald-500/30 rounded-xl p-6 h-[160px] flex flex-col justify-between transition-colors cursor-pointer">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.region}</p>
                  <h3 className="text-lg font-medium mt-1">{p.name}</h3>
                </div>
                <p className="text-[10px] text-zinc-600 font-mono">{p.id}</p>
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="bg-[#1c1c1e] border border-dashed border-[#2c2c2e] rounded-xl p-8 flex flex-col items-center justify-center text-center col-span-2">
              <p className="text-sm text-muted-foreground mb-3">No projects yet. Create one to get started.</p>
              <button onClick={() => setCreating(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">Create Project</button>
            </div>
          )}
        </div>

        {/* Storage info */}
        <div className="mt-8 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Storage Quota</p>
              <p className="text-sm font-medium mt-0.5">2 GB per project · Powered by PostgreSQL</p>
            </div>
            <Database size={20} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Create project modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCreating(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-base font-medium">New Project</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50" onKeyDown={e => e.key === 'Enter' && createProject()} />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 bg-[#2c2c2e] rounded-lg text-sm hover:bg-[#3c3c3e] transition-colors">Cancel</button>
              <button onClick={createProject} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
