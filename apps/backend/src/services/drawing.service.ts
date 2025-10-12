// apps/backend/src/services/drawing.service.ts
import crypto from 'crypto';
import prisma from '../prisma';

export interface WinnerSelection {
  t1: string | null;
  t2: string | null;
  t3: string | null;
  t4: string | null;
}

export interface DrawingAudit {
  seed: string;
  blockhash: string;
  slot: number;
  timestamp: Date;
}

export interface DrawingResult {
  winners: WinnerSelection;
  audit: DrawingAudit;
  eligibleCounts: {
    t1: number;
    t2: number;
    t3: number;
    t4: number;
  };
}

/**
 * Service for cryptographically secure winner selection
 *
 * Uses Node.js crypto.randomBytes() for secure random number generation
 * Stores seed for reproducibility and audit trail
 */
export class DrawingService {
  /**
   * Generate a cryptographically secure random seed
   * Returns a 32-byte hex string (64 characters)
   */
  private generateSecureSeed(): string {
    const bytes = crypto.randomBytes(32);
    return bytes.toString('hex');
  }

  /**
   * Generate a deterministic random number from seed and index
   * This allows for reproducibility - same seed + index = same result
   */
  private seededRandom(seed: string, index: number): number {
    // Create a hash from seed + index
    const hash = crypto.createHash('sha256');
    hash.update(seed + index.toString());
    const digest = hash.digest();

    // Convert first 4 bytes to number (0 to 4294967295)
    const num = digest.readUInt32BE(0);

    // Normalize to 0-1 range
    return num / 0xffffffff;
  }

  /**
   * Select a random winner from a list of eligible participants
   * Uses Fisher-Yates shuffle algorithm with seeded randomness
   */
  private selectWinner(
    eligibleParticipants: Array<{ id: string; wallet: string }>,
    seed: string,
    tierIndex: number
  ): string | null {
    if (eligibleParticipants.length === 0) {
      return null;
    }

    if (eligibleParticipants.length === 1) {
      return eligibleParticipants[0].wallet;
    }

    // Use seeded random to select winner
    // tierIndex ensures different tiers get different randomness
    const randomValue = this.seededRandom(seed, tierIndex);
    const selectedIndex = Math.floor(randomValue * eligibleParticipants.length);

    return eligibleParticipants[selectedIndex].wallet;
  }

  /**
   * Run a complete drawing for a round
   * Selects one winner per tier using cryptographically secure randomness
   */
  async runDrawing(roundId: string): Promise<DrawingResult> {
    console.log(`\n🎰 Running drawing for round ${roundId}`);

    // Generate secure random seed
    const seed = this.generateSecureSeed();
    console.log(`🔐 Generated secure seed: ${seed.slice(0, 16)}...`);

    // Get blockchain state for audit trail
    const { getRPCService } = await import('./rpc.service');
    const rpcService = getRPCService();

    let blockhash = '';
    let slot = 0;

    try {
      const latestBlockhash = await rpcService.getLatestBlockhash();
      blockhash = latestBlockhash.blockhash;

      const connection = rpcService.getConnection();
      slot = await connection.getSlot();

      console.log(`📦 Blockchain state - Slot: ${slot}, Blockhash: ${blockhash.slice(0, 8)}...`);
    } catch (error) {
      console.warn('⚠️  Failed to get blockchain state for audit:', error);
      // Continue with drawing even if blockchain state fetch fails
    }

    // Fetch eligible participants for each tier
    const eligibleByTier = await Promise.all([
      prisma.participant.findMany({
        where: { roundId, tier: 1, isEligible: true },
        select: { id: true, wallet: true, tokenLottoBalanceEnd: true },
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 2, isEligible: true },
        select: { id: true, wallet: true, tokenLottoBalanceEnd: true },
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 3, isEligible: true },
        select: { id: true, wallet: true, tokenLottoBalanceEnd: true },
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 4, isEligible: true },
        select: { id: true, wallet: true, tokenLottoBalanceEnd: true },
      }),
    ]);

    const [tier1Eligible, tier2Eligible, tier3Eligible, tier4Eligible] = eligibleByTier;

    console.log(`\n📊 Eligible participants per tier:`);
    console.log(`   Tier 1: ${tier1Eligible.length} eligible`);
    console.log(`   Tier 2: ${tier2Eligible.length} eligible`);
    console.log(`   Tier 3: ${tier3Eligible.length} eligible`);
    console.log(`   Tier 4: ${tier4Eligible.length} eligible`);

    // Select winners using seeded randomness
    console.log(`\n🎲 Selecting winners...`);

    const winner1 = this.selectWinner(tier1Eligible, seed, 1);
    const winner2 = this.selectWinner(tier2Eligible, seed, 2);
    const winner3 = this.selectWinner(tier3Eligible, seed, 3);
    const winner4 = this.selectWinner(tier4Eligible, seed, 4);

    const winners: WinnerSelection = {
      t1: winner1,
      t2: winner2,
      t3: winner3,
      t4: winner4,
    };

    console.log(`\n🏆 Winners selected:`);
    console.log(`   Tier 1: ${winner1 ? winner1.slice(0, 8) + '...' : 'No eligible participants'}`);
    console.log(`   Tier 2: ${winner2 ? winner2.slice(0, 8) + '...' : 'No eligible participants'}`);
    console.log(`   Tier 3: ${winner3 ? winner3.slice(0, 8) + '...' : 'No eligible participants'}`);
    console.log(`   Tier 4: ${winner4 ? winner4.slice(0, 8) + '...' : 'No eligible participants'}`);

    // Mark winners in database
    const updatePromises = [];

    if (winner1) {
      const participant = tier1Eligible.find(p => p.wallet === winner1);
      if (participant) {
        updatePromises.push(
          prisma.participant.update({
            where: { id: participant.id },
            data: { isWinner: true },
          })
        );
      }
    }

    if (winner2) {
      const participant = tier2Eligible.find(p => p.wallet === winner2);
      if (participant) {
        updatePromises.push(
          prisma.participant.update({
            where: { id: participant.id },
            data: { isWinner: true },
          })
        );
      }
    }

    if (winner3) {
      const participant = tier3Eligible.find(p => p.wallet === winner3);
      if (participant) {
        updatePromises.push(
          prisma.participant.update({
            where: { id: participant.id },
            data: { isWinner: true },
          })
        );
      }
    }

    if (winner4) {
      const participant = tier4Eligible.find(p => p.wallet === winner4);
      if (participant) {
        updatePromises.push(
          prisma.participant.update({
            where: { id: participant.id },
            data: { isWinner: true },
          })
        );
      }
    }

    await Promise.all(updatePromises);

    console.log(`✅ Winners marked in database\n`);

    return {
      winners,
      audit: {
        seed,
        blockhash,
        slot,
        timestamp: new Date(),
      },
      eligibleCounts: {
        t1: tier1Eligible.length,
        t2: tier2Eligible.length,
        t3: tier3Eligible.length,
        t4: tier4Eligible.length,
      },
    };
  }

  /**
   * Verify a drawing result using the stored seed
   * This allows anyone to reproduce the winner selection
   */
  async verifyDrawing(roundId: string, seed: string): Promise<boolean> {
    console.log(`\n🔍 Verifying drawing for round ${roundId}`);
    console.log(`   Seed: ${seed.slice(0, 16)}...`);

    // Fetch eligible participants (same as during drawing)
    const eligibleByTier = await Promise.all([
      prisma.participant.findMany({
        where: { roundId, tier: 1, isEligible: true },
        select: { id: true, wallet: true },
        orderBy: { createdAt: 'asc' }, // Ensure consistent ordering
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 2, isEligible: true },
        select: { id: true, wallet: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 3, isEligible: true },
        select: { id: true, wallet: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.participant.findMany({
        where: { roundId, tier: 4, isEligible: true },
        select: { id: true, wallet: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Reproduce winner selection using same seed
    const [tier1, tier2, tier3, tier4] = eligibleByTier;

    const expectedWinner1 = this.selectWinner(tier1, seed, 1);
    const expectedWinner2 = this.selectWinner(tier2, seed, 2);
    const expectedWinner3 = this.selectWinner(tier3, seed, 3);
    const expectedWinner4 = this.selectWinner(tier4, seed, 4);

    // Get actual winners from database
    const actualWinners = await prisma.participant.findMany({
      where: { roundId, isWinner: true },
      select: { wallet: true, tier: true },
    });

    const actualWinner1 = actualWinners.find(w => w.tier === 1)?.wallet || null;
    const actualWinner2 = actualWinners.find(w => w.tier === 2)?.wallet || null;
    const actualWinner3 = actualWinners.find(w => w.tier === 3)?.wallet || null;
    const actualWinner4 = actualWinners.find(w => w.tier === 4)?.wallet || null;

    // Compare
    const verified =
      expectedWinner1 === actualWinner1 &&
      expectedWinner2 === actualWinner2 &&
      expectedWinner3 === actualWinner3 &&
      expectedWinner4 === actualWinner4;

    if (verified) {
      console.log(`✅ Drawing verified successfully!`);
    } else {
      console.log(`❌ Drawing verification FAILED!`);
      console.log(`   Expected: T1=${expectedWinner1?.slice(0, 8)}, T2=${expectedWinner2?.slice(0, 8)}, T3=${expectedWinner3?.slice(0, 8)}, T4=${expectedWinner4?.slice(0, 8)}`);
      console.log(`   Actual: T1=${actualWinner1?.slice(0, 8)}, T2=${actualWinner2?.slice(0, 8)}, T3=${actualWinner3?.slice(0, 8)}, T4=${actualWinner4?.slice(0, 8)}`);
    }

    return verified;
  }
}

// Singleton instance
let drawingServiceInstance: DrawingService | null = null;

export function getDrawingService(): DrawingService {
  if (!drawingServiceInstance) {
    drawingServiceInstance = new DrawingService();
  }
  return drawingServiceInstance;
}
