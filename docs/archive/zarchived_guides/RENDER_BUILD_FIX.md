# Render Deployment - Complete Fix Guide

## Issues You May Encounter

### Issue 1: TypeScript Build Errors
Build fails with errors like:
```
error TS7016: Could not find a declaration file for module 'cors'
error TS7016: Could not find a declaration file for module 'jsonwebtoken'
error TS7016: Could not find a declaration file for module 'speakeasy'
```

**Root Cause:** Render is not installing `devDependencies` which contain the TypeScript type definitions (`@types/*` packages).

### Issue 2: Database Connection Fails
Health endpoint returns:
```json
{"ok": false, "database": "unhealthy"}
```

**Root Cause:** Render requires IPv4-compatible Session Pooler connection strings from Supabase.

---

## Solution 1: Update Build Command (Recommended)

### Go to your Render service:
1. Click on your service name
2. Go to **Settings** (left sidebar)
3. Scroll to **Build & Deploy** section
4. Change **Build Command** to:
   ```bash
   npm ci && npx prisma generate && npm run build
   ```
5. Click **Save Changes**
6. Go back to **Dashboard** and click **Manual Deploy** → **Deploy latest commit**

### Why this works:
- `npm ci` installs both dependencies and devDependencies
- `npm install` might skip devDependencies in production mode

---

## Solution 2: Add Environment Variable (REQUIRED)

**This is actually required for production builds:**

1. Go to **Environment** tab in Render
2. Add new variable:
   - **Key:** `NPM_CONFIG_PRODUCTION`
   - **Value:** `false`
3. Click **Save Changes**
4. Redeploy

### Why this works:
This forces npm to install devDependencies even in production environment.

---

## Solution 3: Move Types to Dependencies (Quick Fix)

If you need a quick fix, you can move the type packages to regular dependencies:

In `apps/backend/package.json`, move these from `devDependencies` to `dependencies`:
```json
"dependencies": {
  ...existing dependencies...,
  "@types/cors": "^2.8.17",
  "@types/jsonwebtoken": "^9.0.2",
  "@types/speakeasy": "^2.0.10",
  "@types/express": "^4.17.17",
  "@types/node": "^20.11.25",
  "typescript": "^5.3.3"
}
```

Then commit and push:
```bash
git add apps/backend/package.json
git commit -m "Fix: Move TypeScript types to dependencies for Render build"
git push origin main
```

Render will auto-deploy and should succeed.

---

## Verify Build Success

After applying one of the solutions:

1. Watch the build logs in Render dashboard
2. Look for:
   ```
   ✓ Prisma schema loaded
   ✓ TypeScript compilation successful
   ==> Build succeeded 🎉
   ```
3. Check service status shows **Live** (green)
4. Test health endpoint:
   ```bash
   curl https://your-app.onrender.com/api/v1/health
   ```

---

## Database Connection Fix (CRITICAL)

### Problem
After build succeeds, `/api/v1/health` returns `{"ok": false, "database": "unhealthy"}`

### Solution: Use Session Pooler Connection String

Render requires **Session Pooler** format (IPv4 compatible):

1. Go to Supabase Dashboard → **Database Settings** → **Connection String**
2. Select **Session pooler** tab (not Connection string or URI)
3. Copy the connection string - should look like:
   ```
   postgresql://postgres.PROJECT:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

4. **Update these in Render Environment:**
   ```env
   DATABASE_URL=postgresql://postgres.nkiezfkiasqgefzgyuwb:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   DATABASE_URL_RO=postgresql://postgres.nkiezfkiasqgefzgyuwb:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

5. **Important:**
   - Use `pooler.supabase.com` (NOT `db.supabase.co`)
   - URL-encode password: `!` → `%21`, `$` → `%24`, `@` → `%40`
   - Remove `?pgbouncer=true` from the URL
   - Port should be `5432` for Session Pooler

6. **Redeploy** and test: `curl https://your-app.onrender.com/api/v1/health`

---

## Complete Solution Checklist

**For successful Render deployment, ensure ALL of these:**

1. ✅ **Root Directory:** `apps/backend`
2. ✅ **Build Command:** `npm install && npx prisma generate && npm run build`
3. ✅ **Start Command:** `npm start`
4. ✅ **Environment Variable:** `NPM_CONFIG_PRODUCTION=false`
5. ✅ **Database URLs:** Use Session Pooler format (see above)
6. ✅ **Password URL-encoded** if it contains special characters

---

## After Fix: Update Your Deployment Docs

Once you know which solution worked, update your deployment documentation with the correct build command.

---

**Need help?** Check Render logs for more details or let me know which solution you tried!
