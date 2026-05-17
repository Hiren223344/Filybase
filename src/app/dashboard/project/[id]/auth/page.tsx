'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, UserPlus, ShieldCheck, Gear, GoogleLogo, GithubLogo, AppleLogo, Code, Copy, Check, Trash, ArrowClockwise, Key, Bell, Lock, Globe, ShieldWarning, Plugs, ClockCounterClockwise, Lightning, SignOut, Plus } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

type TabId = 'users'|'providers'|'oauth-server'|'sessions'|'policies'|'rate-limits'|'mfa'|'email'|'urls'|'protection'|'hooks'|'audit'|'sdk';

const TABS: {id:TabId;label:string}[] = [
  {id:'users',label:'Users'},{id:'providers',label:'Providers'},{id:'oauth-server',label:'OAuth Server'},
  {id:'sessions',label:'Sessions'},{id:'policies',label:'Policies'},{id:'rate-limits',label:'Rate Limits'},
  {id:'mfa',label:'MFA'},{id:'email',label:'Email'},{id:'urls',label:'URLs'},
  {id:'protection',label:'Protection'},{id:'hooks',label:'Hooks'},{id:'audit',label:'Audit Log'},{id:'sdk',label:'SDK'},
];

export default function AuthManagementPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<TabId>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({totalUsers:0,newThisWeek:0,activeSessions:0});
  const [config, setConfig] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({email:'',password:'',name:''});
  const [copied, setCopied] = useState(false);

  const base = `/api/auth/${projectId}`;

  const load = useCallback(async (key?:string) => {
    const k = key || config?.serviceRoleKey;
    if (!k) return;
    const h = {Authorization:`Bearer ${k}`};
    const [u,s,se,a] = await Promise.all([
      fetch(`${base}/admin/users?limit=20`,{headers:h}),
      fetch(`${base}/admin/stats`,{headers:h}),
      fetch(`${base}/admin/sessions`,{headers:h}),
      fetch(`${base}/admin/audit?limit=30`,{headers:h}),
    ]);
    if(u.ok){const d=await u.json();setUsers(d.users??[]);}
    if(s.ok){const d=await s.json();setStats(d);}
    if(se.ok){const d=await se.json();setSessions(d.sessions??[]);}
    if(a.ok){const d=await a.json();setAudit(d.entries??[]);}
  },[base,config?.serviceRoleKey]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const r=await fetch(`${base}/admin/config`,{headers:{Authorization:'Bearer __dashboard__'}});
      if(r.ok){const c=await r.json();setConfig(c);await load(c.serviceRoleKey);}
      setLoading(false);
    })();
  },[projectId]);

  const addUser=async(e:React.FormEvent)=>{
    e.preventDefault();if(!config)return;
    const r=await fetch(`${base}/admin/users`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.serviceRoleKey}`},body:JSON.stringify(form)});
    if(r.ok){setAddOpen(false);setForm({email:'',password:'',name:''});await load();}
  };
  const delUser=async(id:string)=>{if(!config)return;await fetch(`${base}/admin/users/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${config.serviceRoleKey}`}});await load();};
  const toggleProvider=async(name:string,on:boolean)=>{if(!config)return;const r=await fetch(`${base}/admin/config`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.serviceRoleKey}`},body:JSON.stringify({providers:{[name]:{...config.providers[name],enabled:on}}})});if(r.ok)setConfig(await r.json());};
  const patchConfig=async(patch:any)=>{if(!config)return;const r=await fetch(`${base}/admin/config`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.serviceRoleKey}`},body:JSON.stringify(patch)});if(r.ok)setConfig(await r.json());};
  const revokeSession=async(id:string)=>{if(!config)return;await fetch(`${base}/admin/sessions?sessionId=${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${config.serviceRoleKey}`}});await load();};

  const ago=(ts:number)=>{const d=Date.now()-ts;const m=Math.floor(d/60000);if(m<1)return'now';if(m<60)return m+'m';const h=Math.floor(m/60);if(h<24)return h+'h';return Math.floor(h/24)+'d';};

  const sdk=`import { createFilyAuth } from '@frenix-labs/filybase/auth'\n\nconst auth = createFilyAuth({\n  baseUrl: '${typeof window!=='undefined'?window.location.origin:''}/api/auth/${projectId}',\n  anonKey: '${config?.anonKey??'...'}'\n})\n\nconst { data } = await auth.signUp({ email: 'user@example.com', password: 'password123', name: 'Jane' })\nconst session = await auth.signIn({ email: 'user@example.com', password: 'password123' })\nconst user = await auth.getUser()\nawait auth.signOut()`;

  const copy=()=>{navigator.clipboard.writeText(sdk);setCopied(true);setTimeout(()=>setCopied(false),2000);};

  // Toggle component
  const Toggle=({on,onToggle}:{on:boolean;onToggle:()=>void})=>(
    <button onClick={onToggle} className={`w-10 h-5 rounded-full relative transition-colors ${on?'bg-emerald-500':'bg-[#2c2c2e]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on?'left-[22px]':'left-0.5'}`}/>
    </button>
  );

  // Setting row
  const Row=({label,desc,children}:{label:string;desc?:string;children:React.ReactNode})=>(
    <div className="flex items-center justify-between py-3 border-b border-[#2c2c2e] last:border-0">
      <div><p className="text-sm">{label}</p>{desc&&<p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}</div>
      {children}
    </div>
  );

  const Card=({children,title}:{children:React.ReactNode;title?:string})=>(
    <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-5">
      {title&&<h3 className="text-sm font-medium mb-4">{title}</h3>}
      {children}
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Authentication</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage users, providers, and security.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>load()} className="p-2 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg hover:bg-[#2c2c2e] transition-colors"><ArrowClockwise size={16}/></button>
          <button onClick={()=>setAddOpen(true)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5"><UserPlus size={14}/>Add User</button>
        </div>
      </div>

      {/* Modal */}
      {addOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={()=>setAddOpen(false)}>
        <form onSubmit={addUser} onClick={e=>e.stopPropagation()} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 w-full max-w-sm space-y-3">
          <h3 className="text-base font-medium">Create User</h3>
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"/>
          <input type="email" placeholder="Email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"/>
          <input type="password" placeholder="Password (min 8)" required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"/>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={()=>setAddOpen(false)} className="flex-1 py-2 bg-[#2c2c2e] rounded-lg text-sm hover:bg-[#3c3c3e] transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">Create</button>
          </div>
        </form>
      </div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:'Total Users',v:stats.totalUsers,c:'text-blue-400'},{l:'New This Week',v:'+'+stats.newThisWeek,c:'text-emerald-400'},{l:'Active Sessions',v:stats.activeSessions,c:'text-purple-400'}].map((s,i)=>(
          <div key={i} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-xl font-medium mt-1 ${s.c}`}>{loading?'—':s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 overflow-x-auto border-b border-[#2c2c2e] pb-px">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${tab===t.id?'text-white bg-[#1c1c1e] border border-[#2c2c2e] border-b-[#1c1c1e] -mb-px':'text-muted-foreground hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">

        {tab==='users'&&(
          <Card>{loading?<p className="text-sm text-muted-foreground p-4">Loading...</p>:users.length===0?<p className="text-sm text-muted-foreground p-4">No users yet.</p>:(
            <div className="divide-y divide-[#2c2c2e]">
              {users.map(u=>(
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs text-emerald-400 font-medium">{(u.name||u.email).charAt(0).toUpperCase()}</div>
                    <div><p className="text-sm">{u.name||'—'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.status==='active'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{u.status}</span>
                    <span className="text-xs text-muted-foreground">{ago(u.createdAt)}</span>
                    <button onClick={()=>delUser(u.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors"><Trash size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}</Card>
        )}

        {tab==='providers'&&(
          <ProvidersPanel config={config} onToggle={toggleProvider} onUpdate={patchConfig} />
        )}

        {tab==='oauth-server'&&(
          <div className="space-y-4">
            <Card title="OAuth 2.1 Server">
              <Row label="OAuth Server Enabled" desc="Allow third-party apps to authenticate via your project."><Toggle on={config?.oauthServerEnabled??false} onToggle={()=>patchConfig({oauthServerEnabled:!(config?.oauthServerEnabled??false)})}/></Row>
              <Row label="Authorization Path" desc="Where users approve OAuth requests."><code className="text-xs bg-black/30 px-2 py-1 rounded">{config?.oauthAuthorizationPath??'/oauth/consent'}</code></Row>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p><span className="text-white">Authorization:</span> /api/auth/{projectId}/oauth/authorize</p>
                <p><span className="text-white">Token:</span> /api/auth/{projectId}/oauth/token</p>
                <p><span className="text-white">UserInfo:</span> /api/auth/{projectId}/oauth/userinfo</p>
                <p><span className="text-white">Discovery:</span> /api/auth/{projectId}/.well-known/openid-configuration</p>
              </div>
            </Card>
            <Card title="Supported Features">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Authorization Code + PKCE','Refresh Token Grant','OpenID Connect ID Tokens','Dynamic Client Registration','JWKS Endpoint','Consent Screen'].map(f=>(
                  <div key={f} className="flex items-center gap-2"><Check size={12} className="text-emerald-400"/><span>{f}</span></div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab==='sessions'&&(
          <Card title="Active Sessions">
            {sessions.length===0?<p className="text-sm text-muted-foreground">No active sessions.</p>:(
              <div className="divide-y divide-[#2c2c2e]">
                {sessions.map(s=>(
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div><p className="text-sm font-mono">{s.id.slice(0,12)}...</p><p className="text-xs text-muted-foreground">{s.ip||'unknown'} · {ago(s.createdAt)}</p></div>
                    <button onClick={()=>revokeSession(s.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Revoke</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab==='policies'&&(
          <Card title="Password Policies">
            <Row label="Minimum Length" desc="Minimum characters required."><span className="text-sm font-mono">{config?.passwordPolicy?.minLength??8}</span></Row>
            <Row label="Require Uppercase"><Toggle on={config?.passwordPolicy?.requireUppercase??false} onToggle={()=>patchConfig({passwordPolicy:{...config?.passwordPolicy,requireUppercase:!(config?.passwordPolicy?.requireUppercase??false)}})}/></Row>
            <Row label="Require Numbers"><Toggle on={config?.passwordPolicy?.requireNumbers??false} onToggle={()=>patchConfig({passwordPolicy:{...config?.passwordPolicy,requireNumbers:!(config?.passwordPolicy?.requireNumbers??false)}})}/></Row>
            <Row label="Require Special Characters"><Toggle on={config?.passwordPolicy?.requireSpecialChars??false} onToggle={()=>patchConfig({passwordPolicy:{...config?.passwordPolicy,requireSpecialChars:!(config?.passwordPolicy?.requireSpecialChars??false)}})}/></Row>
            <Row label="Disable Signup" desc="Only admins can create users."><Toggle on={config?.disableSignup??false} onToggle={()=>patchConfig({disableSignup:!(config?.disableSignup??false)})}/></Row>
          </Card>
        )}

        {tab==='rate-limits'&&(
          <Card title="Rate Limits (per hour)">
            <Row label="Signups"><span className="text-sm font-mono">{config?.rateLimits?.signupPerHour??60}</span></Row>
            <Row label="Sign-ins"><span className="text-sm font-mono">{config?.rateLimits?.signinPerHour??300}</span></Row>
            <Row label="Token Refreshes"><span className="text-sm font-mono">{config?.rateLimits?.tokenRefreshPerHour??600}</span></Row>
            <Row label="Emails Sent"><span className="text-sm font-mono">{config?.rateLimits?.emailSentPerHour??30}</span></Row>
            <Row label="SMS Sent"><span className="text-sm font-mono">{config?.rateLimits?.smsPerHour??30}</span></Row>
          </Card>
        )}

        {tab==='mfa'&&(
          <Card title="Multi-Factor Authentication">
            <Row label="MFA Enabled"><Toggle on={config?.mfaConfig?.enabled??false} onToggle={()=>patchConfig({mfaConfig:{...config?.mfaConfig,enabled:!(config?.mfaConfig?.enabled??false)}})}/></Row>
            <Row label="TOTP (Authenticator App)"><Toggle on={config?.mfaConfig?.totpEnabled??true} onToggle={()=>patchConfig({mfaConfig:{...config?.mfaConfig,totpEnabled:!(config?.mfaConfig?.totpEnabled??true)}})}/></Row>
            <Row label="Enforce for All Users"><Toggle on={config?.mfaConfig?.enforceForAllUsers??false} onToggle={()=>patchConfig({mfaConfig:{...config?.mfaConfig,enforceForAllUsers:!(config?.mfaConfig?.enforceForAllUsers??false)}})}/></Row>
            <Row label="Max Factors"><span className="text-sm font-mono">{config?.mfaConfig?.maxFactors??10}</span></Row>
          </Card>
        )}

        {tab==='email'&&(
          <Card title="Email Configuration">
            <Row label="SMTP Host"><span className="text-xs font-mono text-muted-foreground">{config?.emailConfig?.smtpHost||'Not configured'}</span></Row>
            <Row label="SMTP Port"><span className="text-xs font-mono">{config?.emailConfig?.smtpPort??587}</span></Row>
            <Row label="Sender Name"><span className="text-xs">{config?.emailConfig?.senderName||'FilyBase Auth'}</span></Row>
            <Row label="Signup Confirmation Email"><Toggle on={config?.emailConfig?.enableSignupConfirmation??false} onToggle={()=>patchConfig({emailConfig:{...config?.emailConfig,enableSignupConfirmation:!(config?.emailConfig?.enableSignupConfirmation??false)}})}/></Row>
            <Row label="Password Changed Notification"><Toggle on={config?.emailConfig?.enablePasswordChangedNotification??false} onToggle={()=>patchConfig({emailConfig:{...config?.emailConfig,enablePasswordChangedNotification:!(config?.emailConfig?.enablePasswordChangedNotification??false)}})}/></Row>
          </Card>
        )}

        {tab==='urls'&&(
          <Card title="URL Configuration">
            <Row label="Site URL"><code className="text-xs bg-black/30 px-2 py-1 rounded">{config?.urlConfig?.siteUrl??'http://localhost:3000'}</code></Row>
            <Row label="Email Confirmation Path"><code className="text-xs bg-black/30 px-2 py-1 rounded">{config?.urlConfig?.emailConfirmationPath??'/auth/confirm'}</code></Row>
            <Row label="Password Recovery Path"><code className="text-xs bg-black/30 px-2 py-1 rounded">{config?.urlConfig?.passwordRecoveryPath??'/auth/recovery'}</code></Row>
            <Row label="Magic Link Path"><code className="text-xs bg-black/30 px-2 py-1 rounded">{config?.urlConfig?.magicLinkPath??'/auth/magic-link'}</code></Row>
            <div className="mt-3"><p className="text-xs text-muted-foreground">Allowed Redirect URLs:</p><div className="mt-1 space-y-1">{(config?.urlConfig?.redirectUrls??['http://localhost:3000']).map((u:string,i:number)=>(<code key={i} className="block text-xs bg-black/30 px-2 py-1 rounded">{u}</code>))}</div></div>
          </Card>
        )}

        {tab==='protection'&&(
          <Card title="Attack Protection">
            <Row label="Brute Force Protection" desc="Lock accounts after failed attempts."><Toggle on={config?.attackProtection?.bruteForceEnabled??true} onToggle={()=>patchConfig({attackProtection:{...config?.attackProtection,bruteForceEnabled:!(config?.attackProtection?.bruteForceEnabled??true)}})}/></Row>
            <Row label="Max Failed Attempts"><span className="text-sm font-mono">{config?.attackProtection?.maxFailedAttempts??10}</span></Row>
            <Row label="Lockout Duration"><span className="text-sm font-mono">{config?.attackProtection?.lockoutDurationSec??900}s</span></Row>
            <Row label="CAPTCHA"><Toggle on={config?.attackProtection?.captchaEnabled??false} onToggle={()=>patchConfig({attackProtection:{...config?.attackProtection,captchaEnabled:!(config?.attackProtection?.captchaEnabled??false)}})}/></Row>
            <Row label="IP Throttling"><Toggle on={config?.attackProtection?.ipThrottleEnabled??true} onToggle={()=>patchConfig({attackProtection:{...config?.attackProtection,ipThrottleEnabled:!(config?.attackProtection?.ipThrottleEnabled??true)}})}/></Row>
          </Card>
        )}

        {tab==='hooks'&&(
          <Card title="Auth Hooks">
            {(config?.hooks??[]).length===0?<p className="text-sm text-muted-foreground">No hooks configured. Hooks let you run custom logic on auth events (signup, signin, token generation).</p>:(
              <div className="divide-y divide-[#2c2c2e]">{(config?.hooks??[]).map((h:any)=>(
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div><p className="text-sm">{h.name}</p><p className="text-xs text-muted-foreground">{h.event} → {h.uri||'(no URI)'}</p></div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${h.enabled?'bg-emerald-500/10 text-emerald-400':'bg-[#2c2c2e] text-muted-foreground'}`}>{h.enabled?'Active':'Disabled'}</span>
                </div>
              ))}</div>
            )}
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-white">Supported events:</p>
              {['pre_signup','post_signup','pre_signin','post_signin','custom_access_token','mfa_verification','password_verification'].map(e=>(<p key={e} className="font-mono">• {e}</p>))}
            </div>
          </Card>
        )}

        {tab==='audit'&&(
          <Card title="Audit Log">
            {audit.length===0?<p className="text-sm text-muted-foreground">No events recorded yet.</p>:(
              <div className="divide-y divide-[#2c2c2e]">
                {audit.map(e=>(
                  <div key={e.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono bg-[#2c2c2e] px-1.5 py-0.5 rounded">{e.action}</span>
                      <span className="text-xs text-muted-foreground">{e.actorEmail||'system'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{e.ip||'—'}</span>
                      <span>{ago(e.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab==='sdk'&&(
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Quick Start</span>
                <button onClick={copy} className="text-xs text-muted-foreground hover:text-emerald-400 flex items-center gap-1 transition-colors">{copied?<Check size={12}/>:<Copy size={12}/>}{copied?'Copied':'Copy'}</button>
              </div>
              <pre className="text-xs font-mono text-emerald-400/90 bg-black/30 rounded-lg p-4 overflow-x-auto leading-relaxed">{sdk}</pre>
            </Card>
            {config&&<Card title="Project Keys">
              <Row label="Anon Key (public)"><code className="text-[11px] font-mono text-emerald-400">{config.anonKey}</code></Row>
              <Row label="Service Role Key (secret)"><code className="text-[11px] font-mono text-red-400">{'•'.repeat(12)}{config.serviceRoleKey.slice(-8)}</code></Row>
              <Row label="Base URL"><code className="text-[11px] font-mono text-blue-400">{typeof window!=='undefined'?window.location.origin:''}/api/auth/{projectId}</code></Row>
            </Card>}
          </div>
        )}

      </div>
    </div>
  );
}


// ─── Providers Panel ─────────────────────────────────────────────────────────

function ProvidersPanel({ config, onToggle, onUpdate }: { config: any; onToggle: (k: string, on: boolean) => void; onUpdate: (patch: any) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');

  const providers = [
    { k: 'email', n: 'Email / Password', desc: 'Username and password authentication', hasCredentials: false },
    { k: 'google', n: 'Google', desc: 'Sign in with Google OAuth 2.0', hasCredentials: true, docsUrl: 'https://console.cloud.google.com/apis/credentials' },
    { k: 'github', n: 'GitHub', desc: 'Sign in with GitHub OAuth Apps', hasCredentials: true, docsUrl: 'https://github.com/settings/developers' },
    { k: 'apple', n: 'Apple', desc: 'Sign in with Apple', hasCredentials: true, docsUrl: 'https://developer.apple.com/account/resources/identifiers' },
    { k: 'discord', n: 'Discord', desc: 'Sign in with Discord', hasCredentials: true, docsUrl: 'https://discord.com/developers/applications' },
  ];

  const startEdit = (k: string) => {
    const p = config?.providers?.[k] ?? {};
    setClientId(p.clientId ?? '');
    setClientSecret(p.clientSecret === '***redacted***' ? '' : (p.clientSecret ?? ''));
    setRedirectUri(p.redirectUri ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/${config?.projectId}/callback/${k}`);
    setEditing(k);
  };

  const saveProvider = () => {
    if (!editing) return;
    const patch: any = { clientId, redirectUri };
    if (clientSecret) patch.clientSecret = clientSecret;
    onUpdate({ providers: { [editing]: { ...config?.providers?.[editing], ...patch, enabled: true } } });
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      {providers.map(p => {
        const on = config?.providers?.[p.k]?.enabled ?? false;
        const hasId = !!(config?.providers?.[p.k]?.clientId);
        return (
          <div key={p.k} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.n}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                {p.hasCredentials && hasId && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Configured</span>}
                {p.hasCredentials && !hasId && on && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">Missing credentials</span>}
                <button onClick={() => onToggle(p.k, !on)} className={`w-10 h-5 rounded-full relative transition-colors ${on ? 'bg-emerald-500' : 'bg-[#2c2c2e]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {p.hasCredentials && on && editing !== p.k && (
              <div className="mt-3 pt-3 border-t border-[#2c2c2e] flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {hasId ? <span>Client ID: <span className="font-mono text-zinc-400">{config.providers[p.k].clientId.slice(0, 20)}...</span></span> : <span>No credentials configured yet.</span>}
                </div>
                <button onClick={() => startEdit(p.k)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  {hasId ? 'Edit' : 'Configure'}
                </button>
              </div>
            )}

            {editing === p.k && (
              <div className="mt-3 pt-3 border-t border-[#2c2c2e] space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Client ID</label>
                  <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your OAuth Client ID" className="w-full mt-1 bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Client Secret</label>
                  <input value={clientSecret} onChange={e => setClientSecret(e.target.value)} type="password" placeholder={hasId ? '(unchanged if empty)' : 'Your OAuth Client Secret'} className="w-full mt-1 bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Redirect URI <span className="text-zinc-600">(copy this to your provider)</span></label>
                  <input value={redirectUri} onChange={e => setRedirectUri(e.target.value)} className="w-full mt-1 bg-[#121214] border border-[#2c2c2e] rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-mono text-blue-400" />
                </div>
                {p.docsUrl && (
                  <p className="text-[10px] text-muted-foreground">Get credentials from: <a href={p.docsUrl} target="_blank" rel="noopener" className="text-emerald-400 hover:underline">{p.docsUrl}</a></p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-[#2c2c2e] rounded text-xs hover:bg-[#3c3c3e] transition-colors">Cancel</button>
                  <button onClick={saveProvider} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition-colors">Save</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
