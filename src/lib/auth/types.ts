// Shared types for the FilyBase auth layer.

export type UserStatus = "active" | "pending" | "banned";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  passwordHash?: string | null; // null for social-only users
  name?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  metadata: Record<string, unknown>;
  appMetadata: Record<string, unknown>;
  identities: AuthIdentity[];
  lastSignInAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuthIdentity {
  provider: string; // "email" | "google" | "github" | ...
  providerUserId: string;
  email?: string | null;
  createdAt: number;
}

export interface RefreshTokenRecord {
  id: string;
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
  ip?: string | null;
  userAgent?: string | null;
  replacedBy?: string | null;
}

export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecret: string; // hashed
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  createdAt: number;
}

export interface OAuthAuthCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: "S256" | "plain" | null;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

export interface ProjectAuthConfig {
  projectId: string;
  jwtSecret: string; // auto-generated
  jwtAccessTtlSec: number;
  jwtIssuer: string;
  refreshTokenTtlSec: number;
  serviceRoleKey: string; // bearer key for admin endpoints
  anonKey: string; // public bearer key clients advertise with
  disableSignup: boolean;
  requireEmailConfirmation: boolean;
  siteUrl: string;
  allowedRedirects: string[];
  providers: Record<string, ProviderConfig>;

  // Email / Notifications
  emailConfig: EmailConfig;

  // Password policies
  passwordPolicy: PasswordPolicy;

  // Sessions
  sessionConfig: SessionConfig;

  // Rate limits
  rateLimits: RateLimitsConfig;

  // MFA
  mfaConfig: MfaConfig;

  // URL Configuration
  urlConfig: UrlConfig;

  // Attack protection
  attackProtection: AttackProtectionConfig;

  // Auth hooks
  hooks: AuthHookConfig[];

  // OAuth Server
  oauthServerEnabled: boolean;
  oauthAuthorizationPath: string;

  createdAt: number;
  updatedAt: number;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
  enableSignupConfirmation: boolean;
  enablePasswordChangedNotification: boolean;
  enableEmailChangedNotification: boolean;
  confirmationTemplate: string;
  recoveryTemplate: string;
  magicLinkTemplate: string;
  inviteTemplate: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // number of previous passwords to check
  maxAge: number; // days, 0 = never expires
}

export interface SessionConfig {
  singleSessionPerUser: boolean;
  inactivityTimeout: number; // seconds, 0 = disabled
  absoluteTimeout: number; // seconds, 0 = disabled
  refreshTokenRotation: boolean;
  reuseInterval: number; // seconds
}

export interface RateLimitsConfig {
  signupPerHour: number;
  signinPerHour: number;
  tokenRefreshPerHour: number;
  emailSentPerHour: number;
  smsPerHour: number;
  rateLimitHeader: string; // header to use for IP identification
}

export interface MfaConfig {
  enabled: boolean;
  totpEnabled: boolean;
  maxFactors: number;
  enforceForAllUsers: boolean;
  gracePeriodDays: number; // days before MFA is enforced after enrollment
}

export interface UrlConfig {
  siteUrl: string;
  redirectUrls: string[];
  emailConfirmationPath: string;
  passwordRecoveryPath: string;
  emailChangePath: string;
  magicLinkPath: string;
}

export interface AttackProtectionConfig {
  bruteForceEnabled: boolean;
  maxFailedAttempts: number;
  lockoutDurationSec: number;
  captchaEnabled: boolean;
  captchaProvider: "hcaptcha" | "turnstile" | "none";
  captchaSecret: string;
  captchaSiteKey: string;
  ipThrottleEnabled: boolean;
  ipThrottleMaxPerMinute: number;
}

export interface AuthHookConfig {
  id: string;
  name: string;
  event: AuthHookEvent;
  enabled: boolean;
  uri: string; // webhook URL or pg function URI
  secret: string;
  createdAt: number;
}

export type AuthHookEvent =
  | "pre_signup"
  | "post_signup"
  | "pre_signin"
  | "post_signin"
  | "custom_access_token"
  | "custom_sms_provider"
  | "mfa_verification"
  | "password_verification";

export interface AuditLogEntry {
  id: string;
  projectId: string;
  timestamp: number;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetId: string | null;
  targetType: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface ProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface Session {
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  expiresAt: number;
  refreshToken: string;
  user: PublicUser;
}

export type PublicUser = Omit<AuthUser, "passwordHash">;

export function toPublicUser(u: AuthUser): PublicUser {
  const { passwordHash: _drop, ...rest } = u;
  void _drop;
  return rest;
}
