'use client';

import React from 'react';

export default function DocsHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">FilyBase Documentation</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">FilyBase is a self-hosted backend-as-a-service platform. It provides Authentication, a PostgreSQL Database with REST API, Edge Functions, an OAuth 2.1 Server, and OSINT capabilities — all running as a single Next.js application.</p>
      </div>

      <Section title="Quick Start">
        <Code title="1. Clone and install">{`git clone https://github.com/your-org/filybase.git
cd filybase
npm install`}</Code>
        <Code title="2. Configure environment">{`# Create .env.local with your PostgreSQL URL
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
ADMIN_SECRET="your-secret-for-sql-editor"
POSTGRES_PROVIDER="local"  # or "render" for manual provisioning`}</Code>
        <Code title="3. Run">{`npm run dev     # Development (http://localhost:3000)
npm run build   # Production build
npm start       # Start production server`}</Code>
        <p className="text-xs text-zinc-500 mt-3">Tables are auto-created on first request. No manual migration needed.</p>
      </Section>

      <Section title="Architecture">
        <p className="text-sm text-zinc-400 mb-4">Everything runs in one process. The Next.js server handles both the dashboard UI and all API routes. PostgreSQL is the only external dependency.</p>
        <Code>{`┌─────────────────────────────────────────────────────┐
│                   Next.js Server                     │
├──────────────┬──────────────┬───────────────────────┤
│  Dashboard   │   API Routes │   Middleware          │
│  (React UI)  │  /api/auth/* │  (Security, Rate      │
│  /dashboard  │  /api/db/*   │   Limits, Headers)    │
│  /admin      │  /api/fn/*   │                       │
│  /docs       │  /api/osint  │                       │
└──────────────┴──────┬───────┴───────────────────────┘
                      │
              ┌───────▼───────┐
              │  PostgreSQL   │
              │  (Render/     │
              │   Local)      │
              └───────────────┘`}</Code>
      </Section>

      <Section title="Core Concepts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Projects" desc="Each project gets isolated auth, database, and functions. Identified by a unique project ID in all API URLs." />
          <Card title="Keys" desc="Every project has an anon key (public, read-only) and a service role key (secret, full access). Never expose the service role key client-side." />
          <Card title="JWTs" desc="Access tokens are HS256-signed JWTs valid for 1 hour. Refresh tokens rotate on each use and last 30 days." />
          <Card title="Storage" desc="Each project has a 2 GB storage quota. Writes are blocked when exceeded. Reads always work." />
        </div>
      </Section>

      <Section title="API Base URLs">
        <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
          <thead><tr className="bg-zinc-900"><th className="px-3 py-2 text-left text-zinc-500">Service</th><th className="px-3 py-2 text-left text-zinc-500">Base URL</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            <tr><td className="px-3 py-2 text-zinc-300">Auth</td><td className="px-3 py-2 font-mono text-emerald-400">/api/auth/&lt;projectId&gt;</td></tr>
            <tr><td className="px-3 py-2 text-zinc-300">Database REST</td><td className="px-3 py-2 font-mono text-emerald-400">/api/db/&lt;projectId&gt;/&lt;table&gt;</td></tr>
            <tr><td className="px-3 py-2 text-zinc-300">Database SQL</td><td className="px-3 py-2 font-mono text-emerald-400">/api/db/&lt;projectId&gt;/query</td></tr>
            <tr><td className="px-3 py-2 text-zinc-300">Edge Functions</td><td className="px-3 py-2 font-mono text-emerald-400">/api/functions/&lt;projectId&gt;/invoke/&lt;slug&gt;</td></tr>
            <tr><td className="px-3 py-2 text-zinc-300">OAuth</td><td className="px-3 py-2 font-mono text-emerald-400">/api/auth/&lt;projectId&gt;/oauth/*</td></tr>
            <tr><td className="px-3 py-2 text-zinc-300">OSINT</td><td className="px-3 py-2 font-mono text-emerald-400">/api/osint/lookup</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Environment Variables">
        <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
          <thead><tr className="bg-zinc-900"><th className="px-3 py-2 text-left text-zinc-500">Variable</th><th className="px-3 py-2 text-left text-zinc-500">Required</th><th className="px-3 py-2 text-left text-zinc-500">Description</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            <tr><td className="px-3 py-2 font-mono text-zinc-300">DATABASE_URL</td><td className="px-3 py-2 text-red-400">Yes</td><td className="px-3 py-2 text-zinc-400">PostgreSQL connection string</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">ADMIN_SECRET</td><td className="px-3 py-2 text-yellow-400">Prod</td><td className="px-3 py-2 text-zinc-400">Required in production for /api/db/* access</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">ADMIN_USERNAME</td><td className="px-3 py-2 text-zinc-600">No</td><td className="px-3 py-2 text-zinc-400">Admin panel login (default: Hiren2012)</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">ADMIN_PASSWORD</td><td className="px-3 py-2 text-zinc-600">No</td><td className="px-3 py-2 text-zinc-400">Admin panel password (default: HelloHiren)</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">POSTGRES_PROVIDER</td><td className="px-3 py-2 text-zinc-600">No</td><td className="px-3 py-2 text-zinc-400">"local" (auto-provision) or "render" (manual approval)</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">NODE_ENV</td><td className="px-3 py-2 text-zinc-600">No</td><td className="px-3 py-2 text-zinc-400">Set "production" to enable security hardening</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Dashboard Pages">
        <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
          <thead><tr className="bg-zinc-900"><th className="px-3 py-2 text-left text-zinc-500">Path</th><th className="px-3 py-2 text-left text-zinc-500">Description</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard</td><td className="px-3 py-2 text-zinc-400">Project list</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard/project/[id]</td><td className="px-3 py-2 text-zinc-400">Project overview with metrics</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard/project/[id]/auth</td><td className="px-3 py-2 text-zinc-400">Auth management (14 tabs)</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard/project/[id]/database</td><td className="px-3 py-2 text-zinc-400">SQL editor + table browser</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard/project/[id]/functions</td><td className="px-3 py-2 text-zinc-400">Edge functions editor</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/dashboard/project/[id]/api-keys</td><td className="px-3 py-2 text-zinc-400">OSINT API key management</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/admin</td><td className="px-3 py-2 text-zinc-400">DB provisioning admin panel</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/test</td><td className="px-3 py-2 text-zinc-400">Interactive API test console</td></tr>
            <tr><td className="px-3 py-2 font-mono text-zinc-300">/docs</td><td className="px-3 py-2 text-zinc-400">This documentation</td></tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<section className="space-y-3"><h2 className="text-base font-medium text-white">{title}</h2>{children}</section>);
}
function Code({ title, children }: { title?: string; children: string }) {
  return (<div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">{title && <div className="px-4 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-500">{title}</div>}<pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre">{children}</pre></div>);
}
function Card({ title, desc }: { title: string; desc: string }) {
  return (<div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"><p className="text-sm font-medium text-white mb-1">{title}</p><p className="text-xs text-zinc-400">{desc}</p></div>);
}
