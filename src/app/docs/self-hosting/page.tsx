'use client';
import React from 'react';

export default function SelfHostingDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Self-Hosting</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Deploy FilyBase on any platform that runs Node.js. No Docker required. Just a Next.js app + PostgreSQL.</p>
      </div>

      <S title="Requirements">
        <Table headers={['Requirement', 'Minimum']} rows={[
          ['Node.js', '18.x or higher'],
          ['PostgreSQL', '14.x or higher'],
          ['RAM', '512 MB'],
          ['Storage', 'Depends on usage (2 GB quota per project)'],
        ]} />
      </S>

      <S title="Deploy to Render">
        <Code title="1. Create a PostgreSQL database on Render">{`# Go to https://dashboard.render.com
# Create → PostgreSQL
# Copy the External Database URL`}</Code>
        <Code title="2. Create a Web Service">{`# Connect your GitHub repo
# Build Command: npm install && npm run build
# Start Command: npm start
# Environment: Node`}</Code>
        <Code title="3. Set environment variables">{`DATABASE_URL=postgresql://user:pass@host:5432/dbname
ADMIN_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NODE_ENV=production
POSTGRES_PROVIDER=render`}</Code>
      </S>

      <S title="Deploy to Vercel">
        <Code title="1. Connect repo to Vercel">{`# Push to GitHub, connect in Vercel dashboard
# Framework: Next.js (auto-detected)`}</Code>
        <Code title="2. Add environment variables in Vercel dashboard">{`DATABASE_URL=postgresql://...  (use Neon, Supabase, or Render Postgres)
ADMIN_SECRET=your-secret
NODE_ENV=production`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Vercel serverless functions have a 10s timeout on free tier. Edge Functions and long queries may need a Pro plan.</p>
      </S>

      <S title="Deploy to Railway">
        <Code>{`# Railway auto-detects Next.js
# Add a PostgreSQL plugin
# Set DATABASE_URL from the plugin
# Add ADMIN_SECRET and NODE_ENV=production`}</Code>
      </S>

      <S title="Deploy to VPS (Ubuntu)">
        <Code>{`# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createdb filybase
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your-password';"

# 3. Clone and build
git clone https://github.com/your-org/filybase.git
cd filybase
npm install
npm run build

# 4. Set environment
export DATABASE_URL="postgresql://postgres:your-password@localhost:5432/filybase"
export ADMIN_SECRET="$(openssl rand -hex 32)"
export NODE_ENV=production

# 5. Run with PM2
npm install -g pm2
pm2 start npm --name filybase -- start
pm2 save
pm2 startup`}</Code>
      </S>

      <S title="Reverse Proxy (nginx)">
        <Code title="/etc/nginx/sites-available/filybase">{`server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Then: sudo certbot --nginx -d your-domain.com`}</Code>
      </S>

      <S title="Database Provisioning Modes">
        <Table headers={['Mode', 'POSTGRES_PROVIDER', 'Behavior']} rows={[
          ['Local (automatic)', '"local"', 'Each project gets an isolated schema in the same DB. No admin approval needed.'],
          ['Render (manual)', '"render"', 'Users submit a request. Admin provides a dedicated Render PostgreSQL URL.'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Local mode is simpler for single-tenant or dev setups. Render mode gives each user a fully isolated database instance.</p>
      </S>

      <S title="Scaling">
        <p className="text-sm text-zinc-400 mb-3">FilyBase is designed to scale horizontally:</p>
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-2">
          <li><strong>Stateless server:</strong> No in-memory state except rate limit counters. Deploy multiple instances behind a load balancer.</li>
          <li><strong>Rate limiting:</strong> Currently in-memory. For multi-instance, swap to Redis (update src/lib/auth/rate-limit.ts).</li>
          <li><strong>Database:</strong> PostgreSQL handles concurrent connections well. Increase pool max if needed.</li>
          <li><strong>Edge Functions:</strong> Execute in the same process. For isolation, consider running a separate worker service.</li>
        </ul>
      </S>

      <S title="Monitoring">
        <p className="text-sm text-zinc-400 mb-3">Built-in monitoring endpoints:</p>
        <Table headers={['Endpoint', 'Purpose']} rows={[
          ['GET /api/auth/<projectId>/health', 'Auth server health check'],
          ['GET /api/db/quota', 'Database storage usage'],
          ['GET /api/osint/usage', 'OSINT API usage stats'],
          ['GET /api/admin/db-requests', 'Pending provisioning requests'],
        ]} />
      </S>

      <S title="Backup">
        <Code title="PostgreSQL backup">{`# Automated daily backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260517.sql`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Render provides automatic daily backups on paid plans. For free tier, set up a cron job.</p>
      </S>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-base font-medium text-white border-b border-zinc-800 pb-2">{title}</h2>{children}</section>;
}
function Code({ title, children }: { title?: string; children: string }) {
  return <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">{title && <div className="px-4 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-500">{title}</div>}<pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre">{children}</pre></div>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto border border-zinc-800 rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-zinc-900 border-b border-zinc-800">{headers.map(h => <th key={h} className="px-3 py-2 text-left text-zinc-500 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800/50">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 text-zinc-300">{c}</td>)}</tr>)}</tbody></table></div>;
}
