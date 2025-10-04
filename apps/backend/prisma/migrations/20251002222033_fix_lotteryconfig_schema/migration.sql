/*
  Warnings:

  - You are about to drop the `LotteryEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LotteryRound` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LotteryEntry";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LotteryRound";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "LotteryConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "snapshotStart" DATETIME NOT NULL,
    "snapshotEnd" DATETIME NOT NULL,
    "tradePercentage" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "minUsdLottoRequired" REAL NOT NULL DEFAULT 50.0,
    "blacklist" JSONB NOT NULL DEFAULT [],
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotteryConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
