# Phase 3 Quick Start Guide

## 🚀 Getting Started with Phase 3 OAuth

This guide will help you set up and test the OAuth integration infrastructure.

---

## Step 1: Generate Encryption Master Key

```bash
# Run this command to generate a secure encryption key
node -e "console.log('ENCRYPTION_MASTER_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Output will be something like:
# ENCRYPTION_MASTER_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

---

## Step 2: Set Up Google OAuth

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Name it "Priorio" and click Create
4. Wait for project creation to complete

### 2.2 Enable OAuth 2.0

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click it and press "Enable"
4. Go back to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "OAuth client ID"
6. Choose "Web application"
7. Set Application name to "Priorio"
8. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3001/api/integrations/oauth/callback
   ```
9. Click Create
10. Copy the Client ID and Client Secret

### 2.3 Set Up Consent Screen

1. In Google Cloud Console, go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" for User Type
3. Click Create
4. Fill in the required fields:
   - **App name:** Priorio
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
5. Click Save and Continue
6. Skip scopes for now (can add later)
7. Skip test users for now
8. Click Back to Dashboard

---

## Step 3: Configure Environment Variables

### 3.1 Update `.env` file in project root

```bash
# Add these to your .env file
ENCRYPTION_MASTER_KEY=<your-generated-key-from-step-1>
GOOGLE_CLIENT_ID=<your-client-id-from-step-2>
GOOGLE_CLIENT_SECRET=<your-client-secret-from-step-2>
OAUTH_REDIRECT_URL=http://localhost:3001/api/integrations/oauth/callback
WEB_URL=http://localhost:5175
REDIS_URL=redis://localhost:6379
```

### 3.2 Update `apps/api/.env` file

```bash
# Copy the same OAuth variables to the API .env
ENCRYPTION_MASTER_KEY=<your-generated-key-from-step-1>
GOOGLE_CLIENT_ID=<your-client-id-from-step-2>
GOOGLE_CLIENT_SECRET=<your-client-secret-from-step-2>
```

---

## Step 4: Start Services

### 4.1 Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or if you have Redis installed locally
redis-server
```

### 4.2 Start the Application

```bash
# From project root
pnpm dev

# This will start both web (5175) and API (3001)
```

---

## Step 5: Test OAuth Flow

### 5.1 Test Authorization Endpoint

```bash
# Request authorization URL
curl -X POST http://localhost:3001/api/integrations/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/calendar.readonly"]
  }'

# Response will include:
# {
#   "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
#   "state": "csrf-token-here"
# }
```

### 5.2 Visit Authorization URL

1. Open the `authorizationUrl` from the response in your browser
2. You'll be redirected to Google login
3. Log in with your Google account
4. Grant permissions when prompted
5. You'll be redirected back to:
   ```
   http://localhost:5175/integrations/success?connectionId=...
   ```

### 5.3 List OAuth Connections

```bash
# List all connections for the workspace
curl http://localhost:3001/api/integrations/oauth/connections

# Response:
# {
#   "connections": [
#     {
#       "id": "uuid",
#       "provider": "google",
#       "userId": "google-user-id",
#       "scopes": ["gmail.readonly", "calendar.readonly"],
#       "connectedAt": "2026-10-31T...",
#       "status": "active"
#     }
#   ]
# }
```

### 5.4 Get Single Connection

```bash
curl http://localhost:3001/api/integrations/oauth/connections/<connection-id>
```

### 5.5 Revoke Connection

```bash
curl -X DELETE http://localhost:3001/api/integrations/oauth/connections/<connection-id>

# Response:
# {
#   "message": "OAuth connection revoked successfully"
# }
```

---

## Step 6: Verify Token Encryption

### Check Encrypted Token in Database

```bash
# Connect to PostgreSQL
psql postgresql://user:password@localhost:5432/priorio

# Query the oauth_connections table
SELECT id, provider, access_token, revoked_at FROM oauth_connections;

# You should see access_token as encrypted format:
# iv.encrypted.authTag
```

---

## Step 7: Monitor Audit Logs

```bash
# Query audit logs for OAuth operations
curl "http://localhost:3001/api/integrations/oauth/connections" | jq '.connections[0].id' | \
  xargs -I {} psql postgresql://user:password@localhost:5432/priorio \
  -c "SELECT * FROM audit_logs WHERE object_id = '{}' ORDER BY created_at DESC;"
```

---

## Troubleshooting

### Issue: "ENCRYPTION_MASTER_KEY is invalid"
**Solution:** Make sure your key is exactly 64 hex characters (32 bytes)
```bash
# Check key length
echo "a1b2c3..." | wc -c  # Should output 65 (64 + newline)
```

### Issue: "Invalid or expired state parameter"
**Solution:** State tokens expire after 10 minutes. Start the flow again:
```bash
# Request new authorization URL
curl -X POST http://localhost:3001/api/integrations/oauth/authorize ...
```

### Issue: "Invalid redirect URI"
**Solution:** Make sure Google OAuth redirect URI matches exactly:
- In Google Cloud Console: `http://localhost:3001/api/integrations/oauth/callback`
- In `.env`: `OAUTH_REDIRECT_URL=http://localhost:3001/api/integrations/oauth/callback`

### Issue: "Failed to fetch user info"
**Solution:** Check that your scopes are correct. Google requires full scope URLs:
```json
{
  "scopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.readonly"
  ]
}
```

### Issue: Redis connection refused
**Solution:** Make sure Redis is running:
```bash
# Check if Redis is running
redis-cli ping  # Should output "PONG"

# If not, start it
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Next Steps

After successfully testing OAuth:

1. **Set up Gmail Sync** (Phase 3.2)
   - Use the OAuth connection to fetch emails
   - Convert emails to tasks
   - Implement deduplication

2. **Implement Android Notifications** (Phase 3.3)
   - Set up Android app to send notifications
   - Create notification capture endpoints
   - Convert notifications to tasks

3. **Write Tests** (Phase 3.4)
   - Unit tests for encryption
   - Integration tests for OAuth flow
   - E2E tests with real Google account

4. **Add More Providers** (Future)
   - Microsoft OAuth
   - GitHub OAuth
   - Custom OAuth providers

---

## Security Best Practices

✅ **Already Implemented:**
- AES-256-GCM token encryption
- CSRF protection with state tokens
- Automatic token expiration handling
- Workspace isolation
- Audit logging

⚠️ **Additional Recommendations:**
- Always use HTTPS in production
- Rotate encryption key regularly
- Monitor for suspicious OAuth activity
- Implement rate limiting on auth endpoints
- Use refresh tokens with short-lived access tokens
- Implement device fingerprinting for abuse prevention

---

## API Reference

### POST /api/integrations/oauth/authorize

**Request:**
```json
{
  "provider": "google",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly"
  ]
}
```

**Response:**
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "csrf-token"
}
```

---

### GET /api/integrations/oauth/callback

**Parameters:**
- `code` (query): Authorization code from provider
- `state` (query): CSRF token for validation

**Response:**
- Redirects to `http://localhost:5175/integrations/success?connectionId=...`

---

### GET /api/integrations/oauth/connections

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "provider": "google",
      "userId": "provider-user-id",
      "scopes": ["gmail.readonly"],
      "connectedAt": "2026-10-31T...",
      "lastSyncAt": null,
      "status": "active"
    }
  ]
}
```

---

### DELETE /api/integrations/oauth/connections/:id

**Response:**
```json
{
  "message": "OAuth connection revoked successfully"
}
```

---

## Support & Questions

For issues or questions:

1. Check this guide's troubleshooting section
2. Review [PHASE_3_DEVELOPMENT.md](./PHASE_3_DEVELOPMENT.md)
3. Check [PHASE_3_STATUS.md](./PHASE_3_STATUS.md)
4. Open an issue on GitHub

---

**Last Updated:** 2026-10-31  
**Phase:** Phase 3 - Integrations  
**Status:** OAuth Infrastructure Ready ✅
