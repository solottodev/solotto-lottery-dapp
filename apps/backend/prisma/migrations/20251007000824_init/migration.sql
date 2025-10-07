-- CreateEnum
CREATE TYPE "ConfigStatus" AS ENUM ('PENDING', 'VALIDATED', 'FAILED', 'ACTIVE', 'LOCKED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('IDLE', 'RUNNING', 'COMPLETED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "DrawingStatus" AS ENUM ('IDLE', 'RUNNING', 'COMPLETED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryConfig" (
    "id" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "snapshotStart" TIMESTAMP(3) NOT NULL,
    "snapshotEnd" TIMESTAMP(3) NOT NULL,
    "drawTime" TIMESTAMP(3),
    "tradePercentage" DOUBLE PRECISION NOT NULL,
    "status" "ConfigStatus" NOT NULL DEFAULT 'PENDING',
    "minUsdLottoRequired" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "prizeDistributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "slippageTolerancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "blacklist" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotteryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "drawingDate" TIMESTAMP(3),
    "distributionDate" TIMESTAMP(3),
    "prizePoolSol" DOUBLE PRECISION NOT NULL,
    "prizeDistributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "prizeSourceWallet" TEXT,
    "prizeSourceBalanceSol" DOUBLE PRECISION,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "eligibleParticipants" INTEGER NOT NULL DEFAULT 0,
    "tierWinners" JSONB NOT NULL,
    "tierPayouts" JSONB NOT NULL,
    "distributionTxSignatures" JSONB DEFAULT '[]',
    "distributionAtaAddresses" JSONB DEFAULT '{}',
    "swapToLotto" BOOLEAN NOT NULL DEFAULT false,
    "swapRouteId" TEXT,
    "swapSlippage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tokenBalance" DOUBLE PRECISION,
    "tier" INTEGER,
    "eligibilityScore" DOUBLE PRECISION,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'IDLE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "status" "DrawingStatus" NOT NULL DEFAULT 'IDLE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "seed" TEXT,
    "vrfRequestId" TEXT,
    "blockhash" TEXT,
    "slot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Participant_wallet_idx" ON "Participant"("wallet");

-- CreateIndex
CREATE INDEX "Participant_createdAt_idx" ON "Participant"("createdAt");

-- AddForeignKey
ALTER TABLE "LotteryConfig" ADD CONSTRAINT "LotteryConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
