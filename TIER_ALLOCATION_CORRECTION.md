# Tier Allocation Correction Assessment

**Issue:** Current tier prize allocations are incorrect
**Date:** October 11, 2025
**Priority:** HIGH - Affects prize distribution

---

## Current vs Correct Allocations

| Tier | Current (WRONG) | Correct (NEW) | Change |
|------|----------------|---------------|--------|
| Tier 1 | 40% | 40% | ✅ No change |
| Tier 2 | 25% | 30% | ⚠️ +5% |
| Tier 3 | 20% | 20% | ✅ No change |
| Tier 4 | 15% | 10% | ⚠️ -5% |

**Total:** 100% (both current and new)

---

## Files Requiring Changes

### 🔴 CRITICAL - Backend Logic (Prize Calculation)

#### 1. `apps/backend/src/routes/harvest.ts` - Line 10
**Current:**
```typescript
const BASE_PCT = { t1: 0.40, t2: 0.25, t3: 0.20, t4: 0.15 }
```

**Corrected:**
```typescript
const BASE_PCT = { t1: 0.40, t2: 0.30, t3: 0.20, t4: 0.10 }
```

**Impact:** HIGH - This controls actual prize distribution calculation
**Status:** ❌ MUST FIX

---

### 🟡 MEDIUM - Frontend Display Labels

#### 2. `apps/frontend/components/ModuleGrid.tsx` - Lines 236-239
**Current:**
```typescript
{ label: 'Tier 1 (40%)', value: formatSol(allocations.t1 || 0) },
{ label: 'Tier 2 (25%)', value: formatSol(allocations.t2 || 0) },
{ label: 'Tier 3 (20%)', value: formatSol(allocations.t3 || 0) },
{ label: 'Tier 4 (15%)', value: formatSol(allocations.t4 || 0) },
```

**Corrected:**
```typescript
{ label: 'Tier 1 (40%)', value: formatSol(allocations.t1 || 0) },
{ label: 'Tier 2 (30%)', value: formatSol(allocations.t2 || 0) },
{ label: 'Tier 3 (20%)', value: formatSol(allocations.t3 || 0) },
{ label: 'Tier 4 (10%)', value: formatSol(allocations.t4 || 0) },
```

**Impact:** MEDIUM - Displays incorrect percentages to operators
**Status:** ❌ MUST FIX

---

### 🟢 LOW - Documentation Files (Informational)

#### 3. `SESSION_SUMMARY.md` - Lines 933, 938, 943, 948
**Current:**
```markdown
**Tier 1** (40%): 0.879039 SOL
**Tier 2** (25%): 0.549400 SOL
**Tier 3** (20%): 0.439520 SOL
**Tier 4** (15%): 0.329639 SOL
```

**Corrected:**
```markdown
**Tier 1** (40%): [recalculated value] SOL
**Tier 2** (30%): [recalculated value] SOL
**Tier 3** (20%): [recalculated value] SOL
**Tier 4** (10%): [recalculated value] SOL
```

**Impact:** LOW - Historical documentation only
**Status:** 🔵 OPTIONAL (for accuracy)

#### 4. `example_layout/updated_solotto_poc.html` - Lines 597, 605
**Current:**
```html
<div style="color: #a1a1aa; font-size: 0.8rem;">Tier 1 (40%)</div>
<div style="color: #a1a1aa; font-size: 0.8rem;">Tier 3 (20%)</div>
```

**Note:** This file needs a comprehensive review for all tier labels

**Impact:** LOW - Example/template file
**Status:** 🔵 OPTIONAL (if still in use)

---

## Files That Do NOT Need Changes

### Tier Distribution (Participant Tiers) - DIFFERENT FROM PRIZE ALLOCATION

These files describe **participant tier distribution** (how holders are grouped), NOT prize allocation:

❌ **DO NOT CHANGE:**
- `apps/backend/src/services/snapshot.service.ts` - Lines 32, 132
  ```typescript
  * - Tier 1: Top 5% of holders
  * - Tier 2: Next 15% (5% - 20%)
  * - Tier 3: Next 30% (20% - 50%)
  * - Tier 4: Remaining 50% (50% - 100%)
  ```
  **Reason:** This describes HOW MANY participants are in each tier, not prize allocation

❌ **DO NOT CHANGE:**
- `PHASE_1_PROGRESS.md` - Line 128
- `TASK_1.2_COMPLETE.md` - Line 29
- `apps/frontend/components/ModuleGrid.tsx` - Lines 228-231 (participant counts)

**Reason:** These all refer to participant tier distribution, not prize allocation

---

## Implementation Order

### Phase 1: Critical Backend Fix (IMMEDIATE)
1. ✅ Update `apps/backend/src/routes/harvest.ts` line 10
   - Change `BASE_PCT` from `{ t1: 0.40, t2: 0.25, t3: 0.20, t4: 0.15 }`
   - To `{ t1: 0.40, t2: 0.30, t3: 0.20, t4: 0.10 }`

### Phase 2: Frontend Display Fix (HIGH PRIORITY)
2. ✅ Update `apps/frontend/components/ModuleGrid.tsx` lines 236-239
   - Change tier labels to reflect correct percentages

### Phase 3: Documentation Cleanup (OPTIONAL)
3. 🔵 Update `SESSION_SUMMARY.md` (optional - for historical accuracy)
4. 🔵 Update `example_layout/updated_solotto_poc.html` (optional - if still used)

---

## Testing Requirements

After making changes, test the following:

### Backend Testing
```bash
# Test harvest calculation with new allocations
cd apps/backend
npm run test # if tests exist

# Manual test via API:
# 1. Create round with prize pool (e.g., 100 SOL)
# 2. Complete drawing with 4 winners
# 3. Run harvest/prepare
# 4. Verify allocations:
#    - Tier 1: 40 SOL (40%)
#    - Tier 2: 30 SOL (30%)
#    - Tier 3: 20 SOL (20%)
#    - Tier 4: 10 SOL (10%)
```

### Frontend Testing
1. Open operator dashboard
2. Navigate to Harvest module
3. Verify tier labels show correct percentages:
   - Tier 1 (40%)
   - Tier 2 (30%)
   - Tier 3 (20%)
   - Tier 4 (10%)

### Edge Case Testing
Test with missing winners (ensures reallocation works):
- If only 3 tiers have winners, verify sum still equals 100%
- If only 1 tier has winner, verify they get 100%

---

## Summary

### ✅ Files Updated (COMPLETED)
1. ✅ `apps/backend/src/routes/harvest.ts` - Line 10 (CRITICAL) **COMPLETED**
   - Changed from: `{ t1: 0.40, t2: 0.25, t3: 0.20, t4: 0.15 }`
   - Changed to: `{ t1: 0.40, t2: 0.30, t3: 0.20, t4: 0.10 }`

2. ✅ `apps/frontend/components/ModuleGrid.tsx` - Lines 236-239 (HIGH) **COMPLETED**
   - Updated tier labels from (40%/25%/20%/15%) to (40%/30%/20%/10%)

### Files to Update (OPTIONAL)
3. 🔵 `SESSION_SUMMARY.md` - Lines 933, 938, 943, 948
4. 🔵 `example_layout/updated_solotto_poc.html` - Lines 597+

### Files to IGNORE (DO NOT CHANGE)
- `apps/backend/src/services/snapshot.service.ts` (participant tier distribution)
- `PHASE_1_PROGRESS.md` (participant tier distribution)
- `TASK_1.2_COMPLETE.md` (participant tier distribution)
- `apps/frontend/components/ModuleGrid.tsx` lines 228-231 (participant counts)

---

## Verification Checklist

Before deploying:
- [x] Backend `BASE_PCT` updated to `{ t1: 0.40, t2: 0.30, t3: 0.20, t4: 0.10 }`
- [x] Frontend tier labels updated in ModuleGrid
- [ ] Manual test: 100 SOL pool → 40/30/20/10 SOL distribution
- [ ] Edge case test: 3 winners → correct proportional split
- [ ] Documentation reviewed and updated (optional)
- [ ] Code committed with clear message: "Fix tier prize allocations to 40/30/20/10"

---

**Last Updated:** October 11, 2025
**Status:** ✅ IMPLEMENTATION COMPLETE - Ready for testing
**Next Action:** Test the changes with a full lottery workflow
