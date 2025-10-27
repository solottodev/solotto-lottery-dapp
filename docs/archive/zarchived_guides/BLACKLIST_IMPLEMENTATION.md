# Blacklist Implementation - Hardcoded Wallets

**Date**: 2025-10-10
**Session**: Blacklist Hardcoding Refactor

---

## Summary

Implemented a two-tier blacklist system that ensures certain wallets are **permanently blacklisted** from all lottery rounds, while still allowing operators to add additional blacklisted wallets per-round via the Control Form.

---

## Hardcoded Blacklisted Wallets

These wallets are **always excluded** from every lottery round, regardless of Control Form input:

```
1. 11111111111111111111111111111111 (System Program - test/invalid address)
2. 2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte
3. Ch2CeHjsLsBykjSro2wDXScpS3rtkq3eTcQbt124Z1fp
4. A9cG8Kp2XDry69jjL4mGz36TLMkpAdkjvzRwLuKAvFAC
```

---

## Implementation Details

### 1. Environment Variable Configuration

**File**: `.env` and `.env.example`

```env
# Security - Hardcoded blacklist (always enforced across all rounds)
# These wallets are permanently blacklisted from all lottery rounds
# Format: JSON array of Solana wallet addresses
HARD_BLACKLIST='["11111111111111111111111111111111","2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte","Ch2CeHjsLsBykjSro2wDXScpS3rtkq3eTcQbt124Z1fp","A9cG8Kp2XDry69jjL4mGz36TLMkpAdkjvzRwLuKAvFAC"]'
```

**Changes**:
- Added 3 new wallet addresses to HARD_BLACKLIST
- Updated both `.env` and `.env.example`
- Added clear documentation comments

### 2. Backend Logic Enhancement

**File**: `apps/backend/src/routes/control.ts`

**Enhanced Blacklist System** (lines 104-134):

```typescript
// ✅ BLACKLIST SYSTEM: Two-tier approach
// 1. HARD_BLACKLIST (env var): Permanent blacklist enforced across ALL rounds
// 2. Control Form blacklist: Per-round blacklist submitted by operator
// Both lists are merged and deduplicated before snapshot

// Validate submitted blacklist entries from Control Form (basic check)
const submitted = Array.isArray(blacklist) ? blacklist : [];
const invalidSubmitted = submitted.filter((a) => !isLikelySolAddress(a));
if (invalidSubmitted.length > 0) {
  return res.status(400).json({
    error: 'Invalid blacklist entries',
    addresses: invalidSubmitted,
  });
}

// Always-enforced hard blacklist from env (permanently blocks specific wallets)
const hard = parseHardBlacklist();
const invalidHard = hard.filter((a) => !isLikelySolAddress(a));
if (invalidHard.length > 0) {
  console.warn('HARD_BLACKLIST contains invalid entries; they will be ignored:', invalidHard);
}
const effectiveHard = hard.filter((a) => isLikelySolAddress(a));

// Merge: submitted + hardcoded, unique
// Note: Hard blacklist wallets are ALWAYS included, even if not in form
const combined = Array.from(new Set<string>([...submitted, ...effectiveHard]));

console.log(`🔒 Blacklist Summary:
   - Hard blacklist (env): ${effectiveHard.length} wallets
   - Control form blacklist: ${submitted.length} wallets
   - Total combined (unique): ${combined.length} wallets`);
```

**Key Features**:
1. **Two-tier validation**: Validates both Control Form blacklist and HARD_BLACKLIST
2. **Automatic merging**: Combines both lists and removes duplicates
3. **Logging**: Console logs show blacklist breakdown for transparency
4. **Error handling**: Invalid addresses in HARD_BLACKLIST are logged as warnings but don't crash

---

## How It Works

### Control Module Workflow

1. **User submits Control Form** with optional blacklist (comma-separated addresses)
2. **Backend receives submission**:
   - Validates user-submitted blacklist addresses
   - Loads HARD_BLACKLIST from environment variable
   - Validates HARD_BLACKLIST addresses
   - Merges both lists (deduplicated)
3. **Lottery Config created** with combined blacklist
4. **Snapshot module** uses combined blacklist to filter participants

### Example Console Output

When Control module is submitted:

```
🔒 Blacklist Summary:
   - Hard blacklist (env): 4 wallets
   - Control form blacklist: 0 wallets
   - Total combined (unique): 4 wallets
```

If user adds 2 additional wallets via Control Form:

```
🔒 Blacklist Summary:
   - Hard blacklist (env): 4 wallets
   - Control form blacklist: 2 wallets
   - Total combined (unique): 6 wallets
```

---

## Files Modified

### Backend
1. **`apps/backend/.env`** - Added 3 new hardcoded blacklist addresses
2. **`apps/backend/.env.example`** - Added 3 new hardcoded blacklist addresses with documentation
3. **`apps/backend/src/routes/control.ts`** - Enhanced blacklist merging logic with documentation

### Frontend
- **No changes required** - Control Form continues to work as before
- Users can still add per-round blacklisted wallets
- Hardcoded wallets are automatically included on backend

---

## Testing

### Test Case 1: No Control Form Blacklist
**Input**: Control Form with empty blacklist field
**Expected**: 4 wallets blacklisted (from HARD_BLACKLIST)
**Result**: ✅ Passed

### Test Case 2: Control Form with Additional Wallets
**Input**: Control Form with 2 additional wallet addresses
**Expected**: 6 wallets blacklisted (4 hard + 2 form)
**Result**: Pending testing

### Test Case 3: Duplicate Addresses
**Input**: Control Form includes one address already in HARD_BLACKLIST
**Expected**: Deduplicated list (no duplicate)
**Result**: Pending testing

### Test Case 4: Invalid Address in HARD_BLACKLIST
**Input**: HARD_BLACKLIST contains invalid base58 address
**Expected**: Warning logged, invalid address ignored
**Result**: ✅ Handled gracefully

---

## Security Considerations

### 1. Environment Variable Protection
- HARD_BLACKLIST is stored in `.env` (not committed to git)
- Only server administrators can modify it
- Requires server restart to take effect

### 2. Immutability
- Hardcoded wallets **cannot be removed** via Control Form
- Even if user doesn't include them, they're automatically added
- Provides consistent enforcement across all rounds

### 3. Validation
- All addresses validated using Solana base58 format
- Invalid addresses are rejected or ignored (with warnings)
- Prevents malformed data from entering database

---

## Future Enhancements

### 1. Admin Dashboard for HARD_BLACKLIST
- Web UI to manage hardcoded blacklist
- Requires admin authentication
- Updates `.env` file directly

### 2. Blacklist Audit Log
- Track when wallets are added/removed from HARD_BLACKLIST
- Store in separate `BlacklistAudit` table
- Includes timestamp, admin user, reason

### 3. Per-Network Blacklists
- Different HARD_BLACKLIST for devnet vs mainnet
- Environment-specific configuration:
  - `HARD_BLACKLIST_DEVNET`
  - `HARD_BLACKLIST_MAINNET`

### 4. Dynamic Blacklist Updates
- API endpoint to add wallets to HARD_BLACKLIST
- Hot-reload without server restart
- Requires multi-sig admin approval

---

## Deployment Checklist

Before deploying to mainnet:

- [ ] Verify all 4 hardcoded addresses are correct
- [ ] Test blacklist merging with Control Form input
- [ ] Verify snapshot correctly excludes blacklisted wallets
- [ ] Test duplicate address deduplication
- [ ] Ensure `.env` is not committed to version control
- [ ] Document reason for each hardcoded blacklist address
- [ ] Review and approve hardcoded addresses with legal/compliance team

---

## Maintenance

### Adding New Hardcoded Wallets

1. Identify wallet address to blacklist
2. Update `HARD_BLACKLIST` in `.env`:
   ```env
   HARD_BLACKLIST='["address1","address2","NEW_ADDRESS"]'
   ```
3. Update `.env.example` with same change
4. Restart backend server
5. Verify with console logs on next Control submission
6. Document reason in this file

### Removing Hardcoded Wallets

1. Remove address from `HARD_BLACKLIST` in `.env`
2. Update `.env.example`
3. Restart backend server
4. Document reason for removal

---

## Contact

For questions about blacklist implementation:
- Review: [control.ts](apps/backend/src/routes/control.ts#L104-L134)
- Review: [snapshot.ts](apps/backend/src/routes/snapshot.ts#L42-L52)

---

*Document Version: 1.0*
*Last Updated: 2025-10-10*
*Author: Claude (Anthropic)*
