# 2FA Authentication Flow Diagram

## Setup Flow

```
┌─────────────┐
│   Operator  │
└──────┬──────┘
       │
       │ 1. Login (email + password)
       ▼
┌──────────────────────┐
│  POST /auth/login    │
│  Returns: JWT token  │
└──────┬───────────────┘
       │
       │ 2. Request 2FA setup
       │    (with JWT token)
       ▼
┌─────────────────────────────┐
│  POST /auth/setup-2fa       │
│  - Generates TOTP secret    │
│  - Returns QR code + secret │
│  - Saves to database        │
└──────┬──────────────────────┘
       │
       │ 3. QR code + secret
       ▼
┌────────────────────────┐
│  Authenticator App     │
│  (Google Auth/Authy)   │
│  - Scan QR code        │
│  - Add account         │
│  - Generate 6-digit    │
│    codes every 30s     │
└──────┬─────────────────┘
       │
       │ 4. Enter TOTP code
       │    (with JWT token)
       ▼
┌────────────────────────────┐
│  POST /auth/verify-2fa     │
│  - Verifies TOTP code      │
│  - Enables 2FA in DB       │
│  - Returns: success        │
└────────────────────────────┘
```

---

## Login Flow (After 2FA Enabled)

### Step 1: Password Authentication
```
┌─────────────┐
│   Operator  │
└──────┬──────┘
       │
       │ POST /auth/login
       │ { email, password }
       ▼
┌────────────────────────────┐
│  Password Verification     │
│  - Lookup user by email    │
│  - Compare bcrypt hash     │
│  - Check totpEnabled flag  │
└──────┬─────────────────────┘
       │
       ├─── totpEnabled = false ───┐
       │                           │
       │                           ▼
       │                    ┌────────────────┐
       │                    │  Return JWT    │
       │                    │  (immediate)   │
       │                    └────────────────┘
       │
       └─── totpEnabled = true ────┐
                                   │
                                   ▼
                        ┌────────────────────────┐
                        │  Return 200 OK with:   │
                        │  { requiresTOTP: true, │
                        │    message: "..." }    │
                        └────────────────────────┘
```

### Step 2: TOTP Verification
```
┌─────────────┐
│   Operator  │
│  (opens     │
│   auth app) │
└──────┬──────┘
       │
       │ Read current 6-digit code
       │ (refreshes every 30s)
       ▼
┌────────────────────────────┐
│  Authenticator App         │
│  Shows: 123456             │
│  Time remaining: 25s       │
└──────┬─────────────────────┘
       │
       │ POST /auth/login
       │ { email, password, totpCode: "123456" }
       ▼
┌────────────────────────────┐
│  TOTP Verification         │
│  - Verify password again   │
│  - Get user.totpSecret     │
│  - Verify code with        │
│    speakeasy.totp.verify() │
│  - Window: ±1 (30s drift)  │
└──────┬─────────────────────┘
       │
       ├─── Valid ────────────┐
       │                      │
       │                      ▼
       │               ┌────────────────┐
       │               │  Return JWT    │
       │               │  (expires 1h)  │
       │               └────────────────┘
       │
       └─── Invalid ──────────┐
                              │
                              ▼
                     ┌──────────────────┐
                     │  Return 401      │
                     │  "Invalid code"  │
                     └──────────────────┘
```

---

## Disable Flow

```
┌─────────────┐
│   Operator  │
│  (logged in)│
└──────┬──────┘
       │
       │ POST /auth/disable-2fa
       │ { totpCode: "123456" }
       │ (with JWT token in header)
       ▼
┌────────────────────────────┐
│  Disable 2FA Endpoint      │
│  - Verify JWT token        │
│  - Verify TOTP code        │
│  - Set totpEnabled = false │
│  - Set totpSecret = null   │
└──────┬─────────────────────┘
       │
       │ Returns: success
       ▼
┌────────────────────────────┐
│  2FA Disabled              │
│  - Future logins won't     │
│    require TOTP code       │
│  - User can re-enable      │
│    with /auth/setup-2fa    │
└────────────────────────────┘
```

---

## Database State Diagram

```
┌─────────────────────────────┐
│  User (No 2FA)              │
│  ┌──────────────────────┐   │
│  │ totpSecret: null     │   │
│  │ totpEnabled: false   │   │
│  └──────────────────────┘   │
└────────┬────────────────────┘
         │
         │ POST /auth/setup-2fa
         │ (generates secret)
         ▼
┌─────────────────────────────┐
│  User (2FA Setup Started)   │
│  ┌──────────────────────┐   │
│  │ totpSecret: "ABC123" │   │
│  │ totpEnabled: false   │   │
│  └──────────────────────┘   │
└────────┬────────────────────┘
         │
         │ POST /auth/verify-2fa
         │ (verifies code)
         ▼
┌─────────────────────────────┐
│  User (2FA Enabled)         │
│  ┌──────────────────────┐   │
│  │ totpSecret: "ABC123" │   │
│  │ totpEnabled: true    │   │
│  └──────────────────────┘   │
└────────┬────────────────────┘
         │
         │ POST /auth/disable-2fa
         │ (requires TOTP code)
         ▼
┌─────────────────────────────┐
│  User (2FA Disabled)        │
│  ┌──────────────────────┐   │
│  │ totpSecret: null     │   │
│  │ totpEnabled: false   │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

---

## TOTP Time Window

```
Timeline (30-second intervals):
─────────────┬────────────┬────────────┬────────────┬─────────────
             │            │            │            │
         Code A      Code B      Code C      Code D
         (123456)    (789012)    (345678)    (901234)
             │            │            │            │
             │      ┌─────┴─────┐      │            │
             │      │  Current  │      │            │
             │      │   Time    │      │            │
             │      └───────────┘      │            │
             │            │            │            │
             │◄─ Window ─┤            │            │
             │   (±30s)  ├─ Window ──►│            │
             │           │   (±30s)   │            │
             │           │            │            │
      Accepts:     Accepts:      Rejects:    Rejects:
      Code A       Code B        Code C      Code D
      Code B       Code A        Code D      Code E
                   Code C

Window = 1 step (±30 seconds)
- Allows for slight clock drift
- More secure than larger windows
```

---

## Error Handling Flow

```
┌─────────────────────────────────┐
│  Any 2FA Endpoint               │
└────────┬────────────────────────┘
         │
         ├──► No Authorization header
         │    └─► 401: "Missing or invalid authorization header"
         │
         ├──► Invalid/Expired JWT
         │    └─► 401: "Invalid or expired token"
         │
         ├──► User not found
         │    └─► 404: "User not found"
         │
         ├──► Missing TOTP code
         │    └─► 400: "Missing TOTP code"
         │
         ├──► Invalid TOTP code
         │    └─► 401: "Invalid 2FA code"
         │
         ├──► 2FA already enabled
         │    └─► 400: "2FA is already enabled"
         │
         ├──► 2FA not enabled
         │    └─► 400: "2FA is not enabled"
         │
         └──► Success
              └─► 200: { success: true, ... }
```

---

## Security Considerations Diagram

```
┌───────────────────────────────────────────────────┐
│  Defense Layers                                   │
└───────────────────────────────────────────────────┘
         │
         ├─► Layer 1: Password (bcrypt hash)
         │   - 10 rounds
         │   - Unique salt per user
         │
         ├─► Layer 2: TOTP Code (time-based)
         │   - 6 digits
         │   - Changes every 30 seconds
         │   - Window: ±1 step
         │
         ├─► Layer 3: JWT Token (session)
         │   - 1 hour expiration
         │   - Signed with JWT_SECRET
         │   - Required for protected routes
         │
         ├─► Layer 4: Rate Limiting (TODO)
         │   - 5 attempts per 15 minutes
         │   - Per IP address
         │   - Prevents brute force
         │
         └─► Layer 5: Audit Logging (TODO)
             - Log all auth events
             - Monitor failed attempts
             - Alert on suspicious activity
```

---

## Recommended Authenticator Apps

```
┌────────────────────────────────────────────────────────┐
│  Google Authenticator                                  │
│  ✅ Free                                                │
│  ✅ Simple interface                                    │
│  ❌ No cloud backup                                     │
│  📱 iOS, Android                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Authy                                                  │
│  ✅ Free                                                │
│  ✅ Cloud backup/sync                                   │
│  ✅ Multi-device support                                │
│  📱 iOS, Android, Desktop                               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Microsoft Authenticator                                │
│  ✅ Free                                                │
│  ✅ Cloud backup                                        │
│  ✅ Biometric unlock                                    │
│  📱 iOS, Android                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  1Password                                              │
│  💰 Paid subscription                                   │
│  ✅ Integrated with password manager                    │
│  ✅ Encrypted cloud backup                              │
│  📱 iOS, Android, Desktop, Browser                      │
└────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Endpoints
- `POST /auth/setup-2fa` → Generate QR code
- `POST /auth/verify-2fa` → Enable 2FA
- `POST /auth/disable-2fa` → Disable 2FA
- `POST /auth/login` → Login (with optional TOTP)

### Database Fields
- `totpSecret` → Base32 encoded TOTP secret
- `totpEnabled` → Boolean flag for 2FA status

### TOTP Configuration
- **Algorithm:** SHA-1
- **Digits:** 6
- **Period:** 30 seconds
- **Window:** ±1 step (30 seconds)

---

**See Also:**
- [2FA_IMPLEMENTATION_GUIDE.md](./2FA_IMPLEMENTATION_GUIDE.md) - Complete guide
- [2FA_QUICK_START.md](./2FA_QUICK_START.md) - Quick start guide
- [2FA_IMPLEMENTATION_SUMMARY.md](../2FA_IMPLEMENTATION_SUMMARY.md) - Summary
