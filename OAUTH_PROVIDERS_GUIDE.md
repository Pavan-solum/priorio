# Priorio OAuth Providers Configuration Guide

**Version**: 7.0  
**Date**: November 2024  
**Status**: Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Provider Setup](#provider-setup)
4. [OAuth Flow](#oauth-flow)
5. [Token Management](#token-management)
6. [Adding New Providers](#adding-new-providers)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Priorio supports OAuth 2.0 authentication with multiple providers, enabling users to securely connect their accounts without sharing passwords. This guide covers setup, configuration, and best practices.

### Supported Authentication Methods

- **OAuth 2.0 Authorization Code Flow** - Standard for web apps
- **OAuth 2.0 Implicit Flow** - For single-page apps (deprecated)
- **Refresh Token Flow** - For maintaining long-lived connections
- **Scope-Based Permissions** - Granular access control

### Provider Benefits

| Provider | Purpose | Integration Type |
|----------|---------|------------------|
| Microsoft (Azure AD) | Teams, Outlook, Calendar | Delegated OAuth |
| Google | Gmail, Google Calendar | Delegated OAuth |
| GitHub | Issues, PRs, Repositories | Delegated OAuth |
| Slack | Messages, Channels | Bot OAuth |

---

## Supported Providers

### 1. Microsoft Azure AD (Office 365)

**Scope**: Email, Calendar, Teams, Contacts

**Required Scopes**:
```
Mail.Read
Mail.ReadWrite
Calendar.Read
Calendar.ReadWrite
ChannelMessage.Read.All
Team.ReadBasic.All
User.Read
```

**Configuration**:
```json
{
  "provider": "microsoft",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "tenantId": "your-tenant-id",
  "authority": "https://login.microsoftonline.com/your-tenant-id",
  "redirectUri": "https://api.priorio.app/oauth/microsoft/callback",
  "scopes": ["Mail.Read", "Calendar.Read", "User.Read"]
}
```

**Endpoint**: https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/authorize

### 2. Google OAuth 2.0

**Scope**: Gmail, Google Calendar, Contacts, Drive

**Required Scopes**:
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/userinfo.email
```

**Configuration**:
```json
{
  "provider": "google",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "redirectUri": "https://api.priorio.app/oauth/google/callback",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

**Endpoint**: https://accounts.google.com/o/oauth2/v2/auth

### 3. GitHub OAuth

**Scope**: Repositories, Issues, PRs, Gists

**Required Scopes**:
```
repo            # Full access to repositories
read:user       # Read user data
read:org        # Read organization data
gist            # Access gists
```

**Configuration**:
```json
{
  "provider": "github",
  "clientId": "your-github-app-id",
  "clientSecret": "your-github-app-secret",
  "redirectUri": "https://api.priorio.app/oauth/github/callback",
  "scopes": ["repo", "read:user", "gist"]
}
```

**Endpoint**: https://github.com/login/oauth/authorize

### 4. Slack OAuth

**Scope**: Messages, Channels, Users

**Required Scopes**:
```
channels:read
channels:manage
chat:write
users:read
commands
```

**Configuration**:
```json
{
  "provider": "slack",
  "clientId": "your-slack-app-id",
  "clientSecret": "your-slack-app-secret",
  "redirectUri": "https://api.priorio.app/oauth/slack/callback",
  "scopes": ["channels:read", "chat:write", "users:read"]
}
```

**Endpoint**: https://slack.com/oauth/v2/authorize

---

## Provider Setup

### Microsoft Azure AD Setup

**Step 1: Create Application**
```
1. Azure Portal → Azure Active Directory
2. App registrations → New registration
3. Name: Priorio
4. Supported account types: Multitenant
5. Redirect URI: https://api.priorio.app/oauth/microsoft/callback
6. Register
```

**Step 2: Configure Credentials**
```
1. Certificates & secrets → New client secret
2. Copy Client Secret immediately
3. Note Client ID and Tenant ID
4. Store in environment variables
```

**Step 3: Add Permissions**
```
1. API permissions → Add a permission
2. Microsoft Graph → Delegated permissions
3. Add required scopes (Mail.Read, Calendar.Read, etc.)
4. Grant admin consent
```

**Step 4: Configure Redirect URIs**
```
1. Authentication tab
2. Add Platform → Web
3. Redirect URI: https://api.priorio.app/oauth/microsoft/callback
4. Save
```

### Google OAuth Setup

**Step 1: Create Project**
```
1. Google Cloud Console → Create Project
2. Project name: Priorio
3. Create
```

**Step 2: Enable APIs**
```
1. APIs & Services → Enable APIs and Services
2. Enable:
   - Gmail API
   - Google Calendar API
   - Google Contacts API
```

**Step 3: Create Credentials**
```
1. Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized JavaScript origins:
   - https://app.priorio.app
   - https://api.priorio.app
4. Authorized redirect URIs:
   - https://api.priorio.app/oauth/google/callback
5. Create
```

**Step 4: Configure Scopes**
```
Edit OAuth consent screen:
1. User type: External
2. Add scopes:
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/calendar
   - https://www.googleapis.com/auth/userinfo.email
3. Add test users (during development)
4. Submit for verification (for production)
```

### GitHub OAuth Setup

**Step 1: Register Application**
```
1. GitHub → Settings → Developer settings
2. OAuth Applications → New OAuth Application
3. Configure:
   - Application name: Priorio
   - Homepage URL: https://app.priorio.app
   - Authorization callback URL: https://api.priorio.app/oauth/github/callback
4. Create Application
```

**Step 2: Configure Permissions**
```
In GitHub, you can't pre-configure scopes in the app settings.
Scopes are requested dynamically in the authorization URL:
   - repo: Full access to public and private repos
   - read:user: Read user profile data
   - gist: Create and read gists
```

**Step 3: Store Credentials**
```
Note:
- Client ID
- Client Secret
Store in environment variables
```

### Slack OAuth Setup

**Step 1: Create App**
```
1. api.slack.com → Create New App
2. From scratch
3. App name: Priorio
4. Workspace: Select workspace
5. Create App
```

**Step 2: Configure Permissions**
```
1. OAuth & Permissions
2. Redirect URLs:
   - https://api.priorio.app/oauth/slack/callback
3. Scopes (Bot Token Scopes):
   - channels:read
   - channels:manage
   - chat:write
   - users:read
   - commands
```

**Step 3: Install App**
```
1. Install to Workspace
2. Authorize requested permissions
3. Copy Bot User OAuth Token
4. Store securely
```

---

## OAuth Flow

### Authorization Code Flow (Standard)

The most secure OAuth flow for web applications:

```
┌─────────────┐          ┌──────────────┐          ┌─────────────────┐
│   Priorio   │          │  OAuth Login │          │ OAuth Provider  │
│   Frontend  │          │    Screen    │          │   (Google, etc) │
└─────────────┘          └──────────────┘          └─────────────────┘
       │                        │                          │
       │ 1. Click "Connect"     │                          │
       │─────────────────────────────────────────────────→│
       │                        │ 2. Redirect to login     │
       │                        │←──────────────────────────
       │                        │                          │
       │                   [User logs in]                  │
       │                        │                          │
       │                        │ 3. Return code           │
       │ ←─────────────────────────────────────────────────│
       │                        │                          │
       │ 4. Exchange code for token (backend)              │
       │─────────────────────────────────────────────────→│
       │                        │ 5. Return access token   │
       │ ←─────────────────────────────────────────────────│
       │                        │                          │
       │ 6. Success             │                          │
       │←────────────────────────                          │
```

### Step-by-Step Flow

**Step 1: Generate Authorization URL**

```typescript
const authUrl = generateAuthUrl({
  provider: 'google',
  clientId: 'your-client-id',
  redirectUri: 'https://api.priorio.app/oauth/google/callback',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  state: randomState(), // CSRF protection
  accessType: 'offline', // For refresh tokens
  prompt: 'consent' // Force consent screen
});

// User visits: https://accounts.google.com/o/oauth2/v2/auth?...
```

**Step 2: User Authorizes**
- User logs in with provider
- Reviews requested permissions
- Clicks "Allow" or "Authorize"

**Step 3: Provider Redirects**
```
Redirect: https://api.priorio.app/oauth/google/callback?
  code=4/0AX4XfWg...
  &state=random-state-123
```

**Step 4: Exchange Code for Token**

```typescript
const tokens = await exchangeCodeForToken({
  provider: 'google',
  code: 'code-from-redirect',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://api.priorio.app/oauth/google/callback'
});

// Returns:
// {
//   accessToken: "ya29.a0AfH6SMB...",
//   refreshToken: "1//0gSp...", // Only if offline access
//   expiresIn: 3599,
//   tokenType: "Bearer"
// }
```

**Step 5: Use Access Token**

```typescript
// Include in Authorization header
const response = await fetch(
  'https://www.googleapis.com/gmail/v1/users/me/messages',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

---

## Token Management

### Access Tokens

**Purpose**: Authorize API requests

**Characteristics**:
- Short-lived (typically 1 hour)
- Provider-specific format (JWT for some)
- Used in Authorization header
- Cannot be revoked after issue
- Should not be cached long-term

**Usage**:

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};

const response = await fetch('https://api.example.com/resource', {
  headers
});
```

### Refresh Tokens

**Purpose**: Obtain new access tokens without user action

**Characteristics**:
- Long-lived (typically 30-90 days)
- Kept secure in backend only
- Can be revoked
- Should be encrypted in database
- May have usage limits

**Refresh Process**:

```typescript
async function refreshAccessToken(refreshToken, provider) {
  const response = await fetch(
    `https://oauth.provider.com/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config[provider].clientId,
        client_secret: config[provider].clientSecret
      })
    }
  );
  
  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token || refreshToken // Some don't issue new
  };
}
```

### Token Storage

**Best Practices**:

```typescript
interface StoredToken {
  accessToken: string; // AES-256 encrypted
  refreshToken: string; // AES-256 encrypted
  expiresAt: Date; // Calculated from expiresIn
  provider: string;
  scope: string[];
  issuedAt: Date;
}

// Encryption example
import crypto from 'crypto';

function encryptToken(token: string, encryptionKey: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encrypted: string, encryptionKey: Buffer): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Automatic Refresh

**Database Schema**:

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  provider VARCHAR NOT NULL,
  accessToken TEXT ENCRYPTED NOT NULL,
  refreshToken TEXT ENCRYPTED,
  expiresAt TIMESTAMP NOT NULL,
  issuedAt TIMESTAMP DEFAULT NOW(),
  scopes TEXT ARRAY,
  lastUsedAt TIMESTAMP,
  INDEX(userId, provider),
  INDEX(expiresAt)
);
```

**Refresh Strategy**:

```typescript
class TokenManager {
  async getValidToken(userId: string, provider: string) {
    let token = await db.query(
      'SELECT * FROM oauth_tokens WHERE userId = $1 AND provider = $2',
      [userId, provider]
    );
    
    // Check if expired
    if (new Date() > token.expiresAt) {
      // Refresh
      const newToken = await this.refreshToken(
        token.refreshToken,
        provider
      );
      
      // Update database
      await db.query(
        'UPDATE oauth_tokens SET accessToken = $1, expiresAt = $2 WHERE id = $3',
        [newToken.accessToken, newToken.expiresAt, token.id]
      );
      
      token = { ...token, ...newToken };
    }
    
    return token.accessToken;
  }
}
```

### Token Revocation

**Revoke Tokens**:

```typescript
async function revokeToken(
  provider: string,
  accessToken: string
): Promise<boolean> {
  const revokeEndpoints = {
    google: 'https://oauth2.googleapis.com/revoke',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
    github: 'https://github.com/settings/connections/applications',
    slack: 'https://api.slack.com/methods/auth.revoke'
  };
  
  try {
    const response = await fetch(revokeEndpoints[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${accessToken}`
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Failed to revoke ${provider} token:`, error);
    return false;
  }
}
```

---

## Adding New Providers

### Step 1: Create Provider Adapter

```typescript
// src/oauth/adapters/CustomProvider.ts

import { OAuthProvider } from './OAuthProvider';

export class CustomProviderAdapter implements OAuthProvider {
  constructor(private config: OAuthProviderConfig) {}
  
  getAuthUrl(state: string): string {
    return `https://oauth.customprovider.com/authorize?` +
      `client_id=${this.config.clientId}` +
      `&redirect_uri=${this.config.redirectUri}` +
      `&scope=${encodeURIComponent(this.config.scopes.join(' '))}` +
      `&state=${state}` +
      `&response_type=code`;
  }
  
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch(
      'https://oauth.customprovider.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri
        })
      }
    );
    
    return response.json();
  }
  
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(
      'https://oauth.customprovider.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      }
    );
    
    return response.json();
  }
  
  async revokeToken(token: string): Promise<boolean> {
    const response = await fetch(
      'https://oauth.customprovider.com/revoke',
      {
        method: 'POST',
        body: `token=${token}`
      }
    );
    
    return response.ok;
  }
}
```

### Step 2: Register Provider

```typescript
// src/oauth/providerRegistry.ts

import { CustomProviderAdapter } from './adapters/CustomProvider';

const providers = {
  google: GoogleAdapter,
  microsoft: MicrosoftAdapter,
  github: GitHubAdapter,
  custom: CustomProviderAdapter
};

export function getProvider(name: string): OAuthProvider {
  const ProviderClass = providers[name];
  if (!ProviderClass) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  
  return new ProviderClass(getConfig(name));
}
```

### Step 3: Update Configuration

```json
{
  "oauth": {
    "custom": {
      "clientId": "env:CUSTOM_CLIENT_ID",
      "clientSecret": "env:CUSTOM_CLIENT_SECRET",
      "redirectUri": "https://api.priorio.app/oauth/custom/callback",
      "scopes": ["scope1", "scope2"]
    }
  }
}
```

### Step 4: Test Integration

```typescript
describe('CustomProviderAdapter', () => {
  it('should generate correct auth URL', () => {
    const adapter = new CustomProviderAdapter(config);
    const url = adapter.getAuthUrl('state-123');
    
    expect(url).toContain('client_id=');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('state=state-123');
  });
  
  it('should exchange code for token', async () => {
    const token = await adapter.exchangeCodeForToken('code-123');
    
    expect(token.accessToken).toBeDefined();
    expect(token.expiresIn).toBeGreaterThan(0);
  });
});
```

---

## Security Considerations

### 1. Secret Management

✅ DO:
- Store secrets in environment variables
- Use separate secrets per environment
- Rotate secrets regularly
- Use secrets manager (AWS Secrets Manager, etc.)
- Limit who has access to secrets

❌ DON'T:
- Hardcode secrets in code
- Commit secrets to git
- Share secrets via email
- Use same secret across environments
- Log secrets

### 2. Token Protection

✅ DO:
- Encrypt tokens at rest (AES-256)
- Use HTTPS for all communication
- Expire tokens appropriately
- Implement token refresh
- Revoke on logout

❌ DON'T:
- Store unencrypted tokens
- Use HTTP for OAuth
- Keep tokens forever
- Share tokens between users
- Log full tokens

### 3. CSRF Protection

✅ DO:
- Use state parameter in authorization URL
- Validate state on callback
- Generate random state tokens
- Store state temporarily
- Clear state after validation

❌ DON'T:
- Skip state parameter
- Reuse state values
- Trust state from client
- Store state permanently
- Use predictable state

**Implementation**:

```typescript
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

function validateState(received: string, stored: string): boolean {
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(received),
    Buffer.from(stored)
  );
}
```

### 4. Scope Minimization

✅ DO:
- Request only necessary scopes
- Document why each scope is needed
- Review scopes regularly
- Use read-only scopes when possible
- Explain scopes to users

❌ DON'T:
- Request broad scopes
- Request write access unnecessarily
- Request offline access if not needed
- Hide scope requirements
- Change scopes silently

### 5. Consent Screen

✅ DO:
- Show clear OAuth consent screens
- Explain data collection
- Link to privacy policy
- Allow users to review permissions
- Make revocation easy

❌ DON'T:
- Skip consent screen
- Use dark patterns
- Hide permission details
- Make revocation hard
- Force unnecessary scopes

---

## Troubleshooting

### Issue: "Invalid redirect URI"

**Solution**:
1. Verify redirect URI matches exactly in provider settings
2. Check for trailing slashes
3. Ensure HTTPS is used (not HTTP)
4. Confirm protocol (http vs https)
5. Check port number if applicable

### Issue: "Invalid scope"

**Solution**:
1. Check scope names are correct for provider
2. Verify scopes are available
3. Request admin consent if needed
4. Check provider documentation
5. Review OAuth app permissions

### Issue: "Access denied" at redirect

**Solution**:
1. Verify user has required permissions
2. Check OAuth app is correctly registered
3. Confirm user is in correct tenant (for Azure)
4. Check if app needs verification
5. Review error details from provider

### Issue: "Token expired" errors

**Solution**:
1. Implement automatic token refresh
2. Check refresh token is stored
3. Verify refresh token hasn't expired
4. Ensure clock skew handling
5. Re-authenticate if refresh fails

---

**Document Version**: 7.0  
**Last Updated**: November 2024  
**Status**: Complete and Production Ready
