'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Gear,
  Key,
  Lock,
  Copy,
  Check,
  ArrowClockwise,
  Eye,
  EyeSlash,
  FloppyDisk,
  ShieldCheck,
  Timer,
  Globe,
} from '@phosphor-icons/react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectConfig {
  projectId: string;
  serviceRoleKey: string;
  anonKey: string;
  jwtSecret: string;
  jwtAccessTtlSec: number;
  jwtIssuer: string;
  refreshTokenTtlSec: number;
  disableSignup: boolean;
  requireEmailConfirmation: boolean;
  siteUrl: string;
  allowedRedirects: string[];
}

type TabId = 'configuration' | 'api-keys' | 'jwt';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'configuration', label: 'Configuration', icon: Gear },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'jwt', label: 'JWT Tokens', icon: ShieldCheck },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('configuration');
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const baseUrl = `/api/auth/${projectId}`;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/admin/config`, {
        headers: { Authorization: `Bearer __dashboard__` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (patch: Record<string, unknown>) => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/admin/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage project configuration, API keys, and JWT token settings.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          className="p-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg hover:bg-[#2c2c2e] transition-colors duration-200"
        >
          <ArrowClockwise size={16} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-px border-b border-[#2c2c2e] scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap rounded-t-md transition-colors relative ${
              activeTab === tab.id
                ? 'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-transparent -mb-px'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#10b981] border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'configuration' && config && (
              <ConfigurationTab config={config} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'api-keys' && config && (
              <ApiKeysTab config={config} projectId={projectId} />
            )}
            {activeTab === 'jwt' && config && (
              <JwtTab config={config} onSave={handleSave} saving={saving} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Configuration Tab ───────────────────────────────────────────────────────

function ConfigurationTab({
  config,
  onSave,
  saving,
}: {
  config: ProjectConfig;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const [siteUrl, setSiteUrl] = useState(config.siteUrl || '');
  const [disableSignup, setDisableSignup] = useState(config.disableSignup);
  const [requireEmail, setRequireEmail] = useState(config.requireEmailConfirmation);
  const [redirects, setRedirects] = useState(
    (config.allowedRedirects || []).join('\n')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      siteUrl,
      disableSignup,
      requireEmailConfirmation: requireEmail,
      allowedRedirects: redirects
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General */}
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-[#10b981]" />
          <h3 className="text-sm font-medium">General</h3>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Site URL</label>
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://your-app.com"
            className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10b981]/50 transition-colors"
          />
          <p className="text-[11px] text-muted-foreground">
            The base URL of your application. Used for email links and redirects.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Allowed Redirect URLs</label>
          <textarea
            value={redirects}
            onChange={(e) => setRedirects(e.target.value)}
            rows={4}
            placeholder="https://your-app.com/callback&#10;http://localhost:3000/callback"
            className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10b981]/50 transition-colors resize-none font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            One URL per line. These URLs are allowed as redirect targets after authentication.
          </p>
        </div>
      </div>

      {/* Auth Settings */}
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-[#10b981]" />
          <h3 className="text-sm font-medium">Authentication</h3>
        </div>

        <ToggleRow
          label="Disable Sign Up"
          description="Prevent new users from signing up. Existing users can still sign in."
          checked={disableSignup}
          onChange={setDisableSignup}
        />

        <ToggleRow
          label="Require Email Confirmation"
          description="Users must verify their email before they can sign in."
          checked={requireEmail}
          onChange={setRequireEmail}
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#10b981] text-white rounded-lg text-sm font-medium hover:bg-[#0d9668] transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
        >
          <FloppyDisk size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── API Keys Tab ────────────────────────────────────────────────────────────

function ApiKeysTab({
  config,
  projectId,
}: {
  config: ProjectConfig;
  projectId: string;
}) {
  return (
    <div className="space-y-6">
      {/* Project ID */}
      <SecretCard
        label="Project ID"
        value={projectId}
        description="Your unique project identifier. Used in API endpoints."
        alwaysVisible
        icon={<Gear size={16} className="text-blue-400" />}
      />

      {/* Anon Key */}
      <SecretCard
        label="Anon (Public) Key"
        value={config.anonKey}
        description="Safe to use in client-side code. Provides limited access based on Row Level Security policies."
        icon={<Key size={16} className="text-emerald-400" />}
      />

      {/* Service Role Key */}
      <SecretCard
        label="Service Role Key"
        value={config.serviceRoleKey}
        description="Has full access and bypasses Row Level Security. Never expose this in client-side code."
        sensitive
        icon={<ShieldCheck size={16} className="text-red-400" />}
      />

      {/* API URL */}
      <SecretCard
        label="API URL"
        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/${projectId}`}
        description="The base URL for all authentication API requests."
        alwaysVisible
        icon={<Globe size={16} className="text-purple-400" />}
      />
    </div>
  );
}

// ─── JWT Tab ─────────────────────────────────────────────────────────────────

function JwtTab({
  config,
  onSave,
  saving,
}: {
  config: ProjectConfig;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const [accessTtl, setAccessTtl] = useState(String(config.jwtAccessTtlSec || 3600));
  const [refreshTtl, setRefreshTtl] = useState(String(config.refreshTokenTtlSec || 2592000));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      jwtAccessTtlSec: parseInt(accessTtl, 10) || 3600,
      refreshTokenTtlSec: parseInt(refreshTtl, 10) || 2592000,
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* JWT Secret */}
      <SecretCard
        label="JWT Secret"
        value={config.jwtSecret}
        description="Used to sign and verify JWT tokens. Keep this secret safe — rotating it will invalidate all existing tokens."
        sensitive
        icon={<Lock size={16} className="text-amber-400" />}
      />

      {/* JWT Issuer */}
      <SecretCard
        label="JWT Issuer"
        value={config.jwtIssuer || `filybase:${config.projectId}`}
        description="The 'iss' claim in issued JWT tokens."
        alwaysVisible
        icon={<ShieldCheck size={16} className="text-blue-400" />}
      />

      {/* Token Lifetimes */}
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Timer size={16} className="text-[#10b981]" />
          <h3 className="text-sm font-medium">Token Lifetimes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Access Token TTL (seconds)</label>
            <input
              type="number"
              min={60}
              max={86400}
              value={accessTtl}
              onChange={(e) => setAccessTtl(e.target.value)}
              className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10b981]/50 transition-colors font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              ≈ {formatDuration(parseInt(accessTtl, 10) || 0)}. Short-lived tokens reduce risk if compromised.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Refresh Token TTL (seconds)</label>
            <input
              type="number"
              min={3600}
              max={31536000}
              value={refreshTtl}
              onChange={(e) => setRefreshTtl(e.target.value)}
              className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10b981]/50 transition-colors font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              ≈ {formatDuration(parseInt(refreshTtl, 10) || 0)}. Determines how long users stay signed in without re-authenticating.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#10b981] text-white rounded-lg text-sm font-medium hover:bg-[#0d9668] transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
        >
          <FloppyDisk size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function SecretCard({
  label,
  value,
  description,
  sensitive,
  alwaysVisible,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  sensitive?: boolean;
  alwaysVisible?: boolean;
  icon?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(alwaysVisible || false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = visible || alwaysVisible ? value : '•'.repeat(Math.min(value.length, 40));

  return (
    <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {sensitive && (
          <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full font-medium">
            SECRET
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground overflow-hidden">
          <span className="truncate block">{displayValue}</span>
        </div>

        <div className="flex items-center gap-1">
          {!alwaysVisible && (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="p-2 bg-[#2c2c2e] rounded-lg hover:bg-[#3c3c3e] transition-colors"
              title={visible ? 'Hide' : 'Reveal'}
            >
              {visible ? <EyeSlash size={14} /> : <Eye size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 bg-[#2c2c2e] rounded-lg hover:bg-[#3c3c3e] transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check size={14} className="text-[#10b981]" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-[#10b981]' : 'bg-[#3c3c3e]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
