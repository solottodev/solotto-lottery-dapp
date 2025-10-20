# 2FA Quick Start Guide

## 🚨 IMPORTANT: Run Database Migration First

Before testing, run this SQL in Supabase SQL Editor:

```sql
-- Add 2FA fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "totpSecret" TEXT,
ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
```

**Where:** https://app.supabase.com → Project `nkiezfkiasqgefzgyuwb` → SQL Editor

---

## Quick Test Flow

### 1. Get JWT Token
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "operator@solotto.io", "password": "your_password"}'
```

Save the `token` value.

### 2. Setup 2FA
```bash
curl -X POST http://localhost:4000/auth/setup-2fa \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. View QR Code
- Copy the `qrCode` value from response
- Paste into browser address bar
- Scan with Google Authenticator/Authy

### 4. Enable 2FA
```bash
curl -X POST http://localhost:4000/auth/verify-2fa \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"totpCode": "123456"}'
```

Replace `123456` with code from authenticator app.

### 5. Test Login with 2FA
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.io",
    "password": "your_password",
    "totpCode": "123456"
  }'
```

---

## Files Modified

### Backend
- ✅ [apps/backend/prisma/schema.prisma](../apps/backend/prisma/schema.prisma) - Added `totpSecret` and `totpEnabled` fields
- ✅ [apps/backend/src/routes/auth.ts](../apps/backend/src/routes/auth.ts) - Added 2FA endpoints
- ✅ [apps/backend/package.json](../apps/backend/package.json) - Added `speakeasy` and `qrcode`

### Documentation
- ✅ [docs/2FA_IMPLEMENTATION_GUIDE.md](./2FA_IMPLEMENTATION_GUIDE.md) - Complete implementation guide
- ✅ [docs/2FA_QUICK_START.md](./2FA_QUICK_START.md) - This file

### Database
- 📝 [Migration SQL](../apps/backend/prisma/migrations/20251013000000_add_2fa_fields/migration.sql)
- 📝 [Manual Instructions](../apps/backend/prisma/migrations/20251013000000_add_2fa_fields/run-manually.md)

---

## API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/setup-2fa` | POST | Yes (JWT) | Generate QR code |
| `/auth/verify-2fa` | POST | Yes (JWT) | Enable 2FA |
| `/auth/disable-2fa` | POST | Yes (JWT) | Disable 2FA |
| `/auth/login` | POST | No | Login (with optional TOTP) |

---

## Checklist

- [ ] Database migration applied in Supabase
- [ ] Backend server running (`npm run dev`)
- [ ] Authenticator app installed (Google Authenticator/Authy)
- [ ] Test account created
- [ ] 2FA setup tested
- [ ] Login with 2FA tested
- [ ] Disable 2FA tested

---

## Need Help?

See [2FA_IMPLEMENTATION_GUIDE.md](./2FA_IMPLEMENTATION_GUIDE.md) for:
- Detailed API documentation
- Security considerations
- Troubleshooting guide
- Complete test scenarios

---

**Status:** ✅ Implementation Complete | 🔴 Requires Manual Database Migration
**Next:** Run migration SQL, then test with authenticator app
