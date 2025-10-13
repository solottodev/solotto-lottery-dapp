-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "network" TEXT NOT NULL DEFAULT 'devnet';

-- CreateIndex
CREATE INDEX "Round_network_idx" ON "Round"("network");

-- CreateIndex
CREATE INDEX "Round_drawingDate_idx" ON "Round"("drawingDate");
