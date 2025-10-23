# CSV Export Updates - Trading Activity Fields

**Date:** October 23, 2025
**Status:** ✅ ALL CSV EXPORTS UPDATED
**Related:** Trading Activity Implementation (MAINNET_BLOCKERS.md - BLOCKER 1)

---

## 📊 Summary of Changes

All CSV exports across the application have been updated to include the new trading activity fields and proper naming conventions.

### Key Updates:
1. ✅ Added `Token LOTTO Balance Start` column (NEW)
2. ✅ Renamed `Token LOTTO Balance` → `Token LOTTO Balance End` (for clarity)
3. ✅ Renamed `Eligibility Score` → `Trading Activity %` (better UX)
4. ✅ Added `Is Winner` column to Snapshot export (consistency)

---

## 📁 Files Modified

### 1. Snapshot Module CSV Export
**File:** [snapshot.ts:278-317](apps/backend/src/routes/snapshot.ts#L278-L317)
**Endpoint:** `GET /snapshot/:snapshotId/participants/export`

**New Headers:**
```
Round ID, Wallet Address, Participant ID, Round Start Date, Round End Date,
Snapshot ID, Snapshot Started At, Snapshot Completed At,
Token LOTTO Balance Start, Token LOTTO Balance End, Token USD Balance,
Tier, Trading Activity %, Is Eligible, Is Blacklisted, Is Winner
```

**Changes:**
- Added `Token LOTTO Balance Start` column
- Renamed `Token LOTTO Balance` → `Token LOTTO Balance End`
- Renamed `Eligibility Score` → `Trading Activity %`
- Added `Is Winner` column

**Data Mapping:**
```typescript
p.tokenLottoBalanceStart ?? 0,  // START balance (from round creation)
p.tokenLottoBalanceEnd ?? 0,    // END balance (determines tier)
p.tokenUsdBalance ?? 0,          // USD value at snapshot time
p.tier ?? 0,
p.eligibilityScore ?? 0,         // Trading activity percentage
p.isEligible ? 'TRUE' : 'FALSE',
'FALSE',                         // Blacklisted (excluded from table)
p.isWinner ? 'TRUE' : 'FALSE'    // NEW
```

---

### 2. History Module CSV Export
**File:** [history.ts:458-591](apps/backend/src/routes/history.ts#L458-L591)
**Endpoint:** `GET /history/export/round/:id/full`

**New Headers:**
```
Round ID, Wallet Address, Participant ID, Round Start Date, Round End Date,
Drawing Date, Distribution Date, Prize Pool (SOL), Prize Distribution %,
Prize Source Wallet, Prize Source Balance (SOL), Total Participants,
Eligible Participants, Snapshot ID, Snapshot Started At, Snapshot Completed At,
Drawing ID, Drawing Started At, Drawing Completed At, Drawing Seed,
Drawing Blockhash, Drawing Slot,
Token LOTTO Balance Start, Token LOTTO Balance End, Token USD Balance,
Tier, Trading Activity %, Is Eligible, Is Winner, Is Blacklisted,
Prize Tier Won, Prize Amount (SOL), Tier 1 Payout (SOL), Tier 2 Payout (SOL),
Tier 3 Payout (SOL), Tier 4 Payout (SOL), Transaction Signature, Solscan URL,
ATA Address, Swapped To LOTTO, Swap Route ID, Swap Slippage %
```

**Changes:**
- Added `Token LOTTO Balance Start` column
- Renamed `Token LOTTO Balance` → `Token LOTTO Balance End`
- Renamed `Eligibility Score` → `Trading Activity %`

**Data Mapping:**
```typescript
participant.tokenLottoBalanceStart?.toString() || '0',  // NEW: START balance
participant.tokenLottoBalanceEnd?.toString() || '0',    // END balance
participant.tokenUsdBalance?.toString() || '0',
participant.tier?.toString() || '',
participant.eligibilityScore?.toString() || '0',        // Trading activity %
participant.isEligible ? 'TRUE' : 'FALSE',
participant.isWinner ? 'TRUE' : 'FALSE',
'FALSE',                                                // Blacklisted
```

---

### 3. Snapshot JSON API Response
**File:** [snapshot.ts:232-244](apps/backend/src/routes/snapshot.ts#L232-L244)
**Endpoint:** `GET /snapshot/:snapshotId/participants`

**Updated Response:**
```json
{
  "snapshotId": "...",
  "roundId": "...",
  "totalParticipants": 150,
  "eligibleParticipants": 87,
  "participants": [
    {
      "roundId": "...",
      "wallet": "...",
      "tokenLottoBalanceStart": 1000.00,   // NEW
      "tokenLottoBalanceEnd": 1652.30,      // SPLIT FROM tokenLottoBalance
      "tokenUsdBalance": 125.50,
      "assignedTier": 2,
      "tradingActivityPercent": 65.23,
      "isEligible": true,
      "isWinner": false,
      "drawingDate": null,
      "distributionTransaction": null
    }
  ]
}
```

---

## 🔄 Updated Service Integration

### Trading Activity Service
**File:** [trading-activity.service.ts:214-241](apps/backend/src/services/trading-activity.service.ts#L214-L241)

**Now Updates `tokenLottoBalanceStart` in Participant Table:**
```typescript
// Get actual START balance from BalanceSnapshot table
const startSnapshot = await prisma.balanceSnapshot.findUnique({
  where: {
    roundId_wallet_snapshotType: {
      roundId,
      wallet: participant.wallet,
      snapshotType: 'START'
    }
  }
});

// Update participant with trading activity AND actual START balance
await prisma.participant.update({
  where: { id: participant.id },
  data: {
    eligibilityScore: tradePercent,
    tokenLottoBalanceStart: startSnapshot?.tokenBalance ?? participant.tokenLottoBalanceEnd,
  }
});
```

**Enhanced Logging:**
```
✅ WalletABC... - Trade Activity: 65.23% (1000.00 → 1652.30)
❌ WalletXYZ... - Trade Activity: 12.45% (1000.00 → 1124.50)
```

---

## 📋 CSV Field Mapping Reference

| CSV Column | Database Field | Data Type | Description |
|-----------|---------------|-----------|-------------|
| Token LOTTO Balance Start | `tokenLottoBalanceStart` | Float | Balance at round START (for transparency) |
| Token LOTTO Balance End | `tokenLottoBalanceEnd` | Float | Balance at round END (determines tier) |
| Token USD Balance | `tokenUsdBalance` | Float | USD value at snapshot time |
| Trading Activity % | `eligibilityScore` | Float | Calculated trading percentage |
| Is Eligible | `isEligible` | Boolean | TRUE if meets both USD + trade thresholds |
| Is Winner | `isWinner` | Boolean | TRUE if selected in drawing |
| Is Blacklisted | N/A | Boolean | Always FALSE (excluded from table) |

---

## ✅ Verification Checklist

### Before Deploying:

- [x] Snapshot CSV export updated with new fields
- [x] History CSV export updated with new fields
- [x] JSON API responses updated with new fields
- [x] Trading activity service updates `tokenLottoBalanceStart`
- [x] Field names standardized across all exports
- [x] Boolean values use TRUE/FALSE format
- [x] Comments added explaining each field
- [x] SCHEMA_AND_CSV_ALIGNMENT.md updated to v3.0

### After Deploying:

- [ ] Test Snapshot CSV export with a real round
- [ ] Test History CSV export with a complete round
- [ ] Verify all columns appear in correct order
- [ ] Verify START balance shows actual captured value
- [ ] Verify Trading Activity % calculates correctly
- [ ] Compare CSV output with SCHEMA_AND_CSV_ALIGNMENT.md

---

## 🧪 Testing the Updates

### Test Snapshot CSV Export:

1. Create a new round via Control module
2. Wait for some trading activity
3. Run snapshot
4. Confirm snapshot
5. Export CSV from Snapshot module
6. Verify columns:
   ```
   Token LOTTO Balance Start, Token LOTTO Balance End, Trading Activity %
   ```

### Test History CSV Export:

1. Complete a full round (control → snapshot → drawing → distribution)
2. Export CSV from History module
3. Verify all fields present with correct naming
4. Check that START and END balances differ for wallets with activity

### Expected CSV Sample:

| Wallet | Token LOTTO Balance Start | Token LOTTO Balance End | Trading Activity % | Is Eligible |
|--------|---------------------------|------------------------|-------------------|-------------|
| Abc... | 1000.00 | 1652.30 | 65.23 | TRUE |
| Xyz... | 1000.00 | 1124.50 | 12.45 | FALSE |
| Def... | 2000.00 | 900.00 | 55.00 | TRUE |

---

## 📚 Related Documentation

- **[TRADING_ACTIVITY_FIXES.md](TRADING_ACTIVITY_FIXES.md)** - Bug fixes and deployment guide
- **[TRADING_ACTIVITY_DEPLOYMENT.md](TRADING_ACTIVITY_DEPLOYMENT.md)** - Original deployment guide
- **[SCHEMA_AND_CSV_ALIGNMENT.md](SCHEMA_AND_CSV_ALIGNMENT.md)** - Complete schema and CSV reference (v3.0)
- **[MAINNET_BLOCKERS.md](MAINNET_BLOCKERS.md)** - Original blocker documentation

---

## 🎯 Next Steps

1. **Deploy the updated code** to production
2. **Restart backend** to load new CSV export logic
3. **Test with a new round** to verify CSV exports
4. **Verify field order** matches SCHEMA_AND_CSV_ALIGNMENT.md
5. **Update any downstream systems** that parse CSV files

---

**Last Updated:** October 23, 2025
**Status:** Ready for Production Deployment
**All CSV Exports:** ✅ UPDATED AND ALIGNED
