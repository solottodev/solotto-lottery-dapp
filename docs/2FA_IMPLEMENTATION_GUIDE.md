# 2FA Implementation Guide

## Overview
This guide documents the 2FA (Two-Factor Authentication) implementation for the Solotto Lottery operator accounts using TOTP (Time-based One-Time Password).

## Implementation Status

### ✅ Completed
1. **Backend Dependencies Installed**
   - `speakeasy` - TOTP generation and verification
   - `qrcode` - QR code generation for authenticator apps
   - `@types/qrcode` - TypeScript types

2. **Database Schema Updated**
   - Added `totpSecret` field to User model (stores TOTP secret)
   - Added `totpEnabled` field to User model (tracks 2FA status)
   - Migration file created: `20251013000000_add_2fa_fields`

3. **API Endpoints Created**
   - `POST /auth/login` - Updated to support 2FA flow
   - `POST /auth/setup-2fa` - Initialize 2FA setup
   - `POST /auth/verify-2fa` - Verify and enable 2FA
   - `POST /auth/disable-2fa` - Disable 2FA (requires TOTP code)

### 🔴 Pending: Database Migration

**The database migration needs to be run manually in Supabase SQL Editor due to connection pool locking.**

#### Steps to Run Migration:

1. **Open Supabase SQL Editor**
   - Go to https://app.supabase.com
   - Select project: `nkiezfkiasqgefzgyuwb`
   - Navigate to: SQL Editor

2. **Run this SQL:**
   ```sql
   -- Add 2FA fields to User table
   ALTER TABLE "User"
   ADD COLUMN IF NOT EXISTS "totpSecret" TEXT,
   ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
   ```

3. **Verify the migration:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'User'
     AND column_name IN ('totpSecret', 'totpEnabled');
   ```

   Expected output:
   ```
   totpSecret  | text    | YES
   totpEnabled | boolean | NO
   ```

4. **Mark migration as applied (optional):**
   ```bash
   cd apps/backend
   npx prisma migrate resolve --applied 20251013000000_add_2fa_fields
   ```

---

## API Documentation

### 1. Setup 2FA
**Endpoint:** `POST /auth/setup-2fa`

**Description:** Generates a TOTP secret and QR code for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "otpauthUrl": "otpauth://totp/Solotto%20(user@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=Solotto%20Lottery",
  "message": "Scan the QR code with your authenticator app and verify with /auth/verify-2fa"
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `400` - 2FA already enabled
- `404` - User not found

---

### 2. Verify and Enable 2FA
**Endpoint:** `POST /auth/verify-2fa`

**Description:** Verifies the TOTP code and enables 2FA for the user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "totpCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA enabled successfully. You will now need to provide a code when logging in."
}
```

**Error Responses:**
- `400` - Missing TOTP code
- `401` - Invalid TOTP code or token
- `400` - 2FA setup not initiated
- `400` - 2FA already enabled

---

### 3. Login with 2FA
**Endpoint:** `POST /auth/login`

**Description:** Authenticates user with email, password, and optional TOTP code.

**Body (Step 1 - Password only):**
```json
{
  "email": "operator@solotto.io",
  "password": "your_password"
}
```

**Response (200 OK - 2FA Required):**
```json
{
  "requiresTOTP": true,
  "message": "2FA code required"
}
```

**Body (Step 2 - With TOTP code):**
```json
{
  "email": "operator@solotto.io",
  "password": "your_password",
  "totpCode": "123456"
}
```

**Response (200 OK - Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `401` - Invalid 2FA code

---

### 4. Disable 2FA
**Endpoint:** `POST /auth/disable-2fa`

**Description:** Disables 2FA for the authenticated user (requires current TOTP code).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "totpCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

**Error Responses:**
- `400` - Missing TOTP code
- `401` - Invalid TOTP code or token
- `400` - 2FA not enabled

---

## Testing Guide

### Prerequisites
1. **Install an Authenticator App** (one of the following):
   - Google Authenticator (iOS/Android)
   - Authy (iOS/Android/Desktop)
   - Microsoft Authenticator (iOS/Android)
   - 1Password (has built-in TOTP support)

2. **Backend server running:**
   ```bash
   cd apps/backend
   npm run dev
   ```

3. **Database migration applied** (see Pending section above)

---

### Test Scenario 1: Enable 2FA for Operator Account

#### Step 1: Login and get JWT token
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.io",
    "password": "your_password"
  }'
```

Save the returned `token` for subsequent requests.

#### Step 2: Setup 2FA
```bash
curl -X POST http://localhost:4000/auth/setup-2fa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response will include:**
- `secret` - Base32 encoded secret (backup this securely)
- `qrCode` - Data URL of QR code image
- `otpauthUrl` - URL for manual entry

#### Step 3: Scan QR Code
1. Copy the `qrCode` data URL from the response
2. Open it in a browser to display the QR code
3. Scan with your authenticator app
4. The app will show a 6-digit code that refreshes every 30 seconds

**Alternative (Manual Entry):**
- Open your authenticator app
- Select "Manual Entry" or "Enter a Setup Key"
- Account name: `Solotto (operator@solotto.io)`
- Key: Paste the `secret` value
- Type: Time-based

#### Step 4: Verify TOTP Code
```bash
curl -X POST http://localhost:4000/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "totpCode": "123456"
  }'
```

Replace `123456` with the current code from your authenticator app.

**Expected Result:**
```json
{
  "success": true,
  "message": "2FA enabled successfully. You will now need to provide a code when logging in."
}
```

---

### Test Scenario 2: Login with 2FA Enabled

#### Step 1: Login with password only
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.io",
    "password": "your_password"
  }'
```

**Expected Response:**
```json
{
  "requiresTOTP": true,
  "message": "2FA code required"
}
```

#### Step 2: Login with password + TOTP code
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.io",
    "password": "your_password",
    "totpCode": "123456"
  }'
```

Replace `123456` with the current code from your authenticator app.

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Test Scenario 3: Disable 2FA

#### Step 1: Get a valid JWT token
Login with password + TOTP code (see Test Scenario 2)

#### Step 2: Disable 2FA
```bash
curl -X POST http://localhost:4000/auth/disable-2fa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "totpCode": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

#### Step 3: Verify 2FA is disabled
Login with password only - should receive JWT token immediately without requiring TOTP code.

---

## Security Considerations

### TOTP Configuration
- **Algorithm:** SHA-1 (TOTP standard)
- **Token Length:** 6 digits
- **Time Step:** 30 seconds
- **Window:** ±1 step (allows for 30s clock drift)

### Secret Storage
- Secrets are stored in the database as base32-encoded strings
- Consider encrypting the `totpSecret` field at the application level for additional security
- Recommended: Use database-level encryption or application-level encryption with a master key

### Rate Limiting
**Recommended:** Add rate limiting to prevent brute-force attacks on TOTP codes:

```typescript
import rateLimit from 'express-rate-limit';

const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many 2FA verification attempts, please try again later.',
});

// Apply to 2FA endpoints
app.use('/auth/verify-2fa', twoFactorLimiter);
app.use('/auth/login', twoFactorLimiter);
```

### Backup Codes (Future Enhancement)
Consider implementing backup codes for account recovery:
- Generate 10 single-use backup codes during 2FA setup
- Store hashed versions in database
- Allow users to download and print codes
- Can be used if authenticator app is lost

---

## Troubleshooting

### Issue: "Invalid 2FA code" error
**Possible Causes:**
1. **Clock drift** - Server and client clocks are out of sync
   - Solution: Ensure server time is synchronized with NTP
   - Check with: `timedatectl` (Linux) or `w32tm /query /status` (Windows)

2. **Expired code** - TOTP codes expire every 30 seconds
   - Solution: Try a fresh code immediately after it appears

3. **Wrong secret** - Secret was not saved correctly
   - Solution: Disable and re-enable 2FA

### Issue: Migration fails with advisory lock timeout
**Cause:** Supabase connection pool is holding locks

**Solution:** Run the SQL directly in Supabase SQL Editor (see Pending section)

### Issue: QR code doesn't display
**Cause:** The QR code is returned as a data URL

**Solution:**
1. Copy the `qrCode` value from API response
2. Paste into browser address bar
3. Or use an HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <img src="PASTE_QR_CODE_DATA_URL_HERE" />
   </body>
   </html>
   ```

---

## Next Steps

### For Mainnet Deployment
1. ✅ Run database migration in Supabase (manual)
2. ✅ Test 2FA flow end-to-end
3. 🔜 Add rate limiting to auth endpoints
4. 🔜 Implement backup codes (optional)
5. 🔜 Add 2FA status to operator dashboard
6. 🔜 Create frontend UI for 2FA setup/verification
7. 🔜 Document 2FA setup process for operators
8. 🔜 Add email notifications for 2FA changes

### Frontend Integration (Future)
Create React components for:
- `<Setup2FA />` - Display QR code, handle verification
- `<Login2FA />` - Two-step login form (password → TOTP)
- `<Manage2FA />` - Enable/disable 2FA in settings

---

## Checklist for Mainnet

- [ ] Database migration applied in Supabase
- [ ] 2FA tested with Google Authenticator
- [ ] 2FA tested with Authy
- [ ] Rate limiting configured on auth endpoints
- [ ] Operator trained on 2FA usage
- [ ] Backup of TOTP secret stored securely (encrypted)
- [ ] 2FA status visible in operator dashboard
- [ ] Documentation updated in operator runbook

---

**Implementation Date:** October 13, 2025
**Status:** ✅ Backend Implementation Complete | 🔴 Database Migration Pending
**Next Review:** After manual migration and testing
