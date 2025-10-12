-- AlterTable: Replace tokenBalance with tokenLottoBalanceStart, tokenLottoBalanceEnd, and tokenUsdBalance
-- This supports the two-part eligibility check:
-- 1. Trading Activity: Balance must change by ≥50% (uses start/end balances)
-- 2. USD Threshold: Must hold ≥$50 USD worth (uses tokenUsdBalance)

-- Step 1: Add new columns (nullable)
ALTER TABLE "Participant" ADD COLUMN "tokenLottoBalanceStart" DOUBLE PRECISION;
ALTER TABLE "Participant" ADD COLUMN "tokenLottoBalanceEnd" DOUBLE PRECISION;
ALTER TABLE "Participant" ADD COLUMN "tokenUsdBalance" DOUBLE PRECISION;

-- Step 2: Migrate existing data
-- For existing records, copy tokenBalance to all three fields
-- NOTE: Existing records won't have accurate start/end balances or USD values
-- Future snapshots will populate these fields correctly
UPDATE "Participant"
SET
  "tokenLottoBalanceStart" = "tokenBalance",
  "tokenLottoBalanceEnd" = "tokenBalance",
  "tokenUsdBalance" = "tokenBalance"
WHERE "tokenBalance" IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE "Participant" DROP COLUMN IF EXISTS "tokenBalance";
ALTER TABLE "Participant" DROP COLUMN IF EXISTS "tokenLottoBalance";
