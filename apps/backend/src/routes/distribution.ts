import express from 'express'
import { requireJwt } from '../middleware/requireJwt'
import prisma from '../prisma'
import { getRPCService } from '../services/rpc.service'
import { getJupiterService } from '../services/jupiter.service'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js'

const router = express.Router()

// POST /distribution/prepare - Creates unsigned transaction for frontend to sign
router.post('/prepare', requireJwt, async (req, res) => {
  try {
    const { roundId, operatorWalletAddress, swapToLotto, slippagePercent, confirmFallback } = req.body || {}
    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })
    if (!operatorWalletAddress) return res.status(400).json({ error: 'Missing operatorWalletAddress' })

    console.log(`\n🎁 Preparing distribution transaction for round ${roundId}`)
    console.log(`   Swap to LOTTO: ${swapToLotto ? 'Yes' : 'No'}`)

    // Get round with winners and payouts
    const round = await prisma.round.findUnique({ where: { id: roundId } })
    if (!round) return res.status(404).json({ error: 'Round not found' })

    const winners = (round.tierWinners as any) || {}
    const payouts = (round.tierPayouts as any) || {}

    // Validate we have winners and payouts
    const tiers = (['t1', 't2', 't3', 't4'] as const).filter(
      (t) => winners[t] && payouts[t] > 0
    )

    if (tiers.length === 0) {
      return res.status(400).json({ error: 'No winners or payouts found' })
    }

    // Parse operator wallet address (from frontend Phantom wallet)
    let fromPubkey: PublicKey
    try {
      fromPubkey = new PublicKey(operatorWalletAddress)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid operator wallet address' })
    }

    console.log(`   Prize Source (Operator): ${fromPubkey.toBase58().slice(0, 8)}...`)

    // Get RPC connection
    const rpcService = getRPCService()
    const connection = rpcService.getConnection()

    // Check if Jupiter swap is requested and available
    const jupiterService = getJupiterService()
    const shouldSwap = swapToLotto && jupiterService.isAvailable()

    if (swapToLotto && !jupiterService.isAvailable()) {
      console.warn(`   ⚠️  Swap requested but Jupiter not configured`)
      if (!confirmFallback) {
        const totalAmountSOL = (['t1','t2','t3','t4'] as const)
          .filter(t => winners[t] && payouts[t] > 0)
          .reduce((sum, t) => sum + payouts[t], 0)

        return res.status(412).json({
          error: 'JUPITER_NOT_CONFIGURED',
          action: 'CONFIRM_SOL_FALLBACK',
          message: 'Jupiter swap not configured. Confirm to fallback to SOL distribution.',
          fallbackProposal: {
            winners: (['t1','t2','t3','t4'] as const)
              .filter(t => winners[t] && payouts[t] > 0)
              .map(t => ({ tier: t, address: winners[t], amountSOL: payouts[t] })),
            totalAmountSOL
          }
        })
      }
      // If confirmFallback is true, proceed to SOL build below
    }

    // OPTION 1: Build Jupiter Swap Transactions (SOL → LOTTO for each winner)
    if (shouldSwap) {
      try {
        console.log(`\n🔄 Building Jupiter Swap transactions...`)

        const slippage = slippagePercent || 0.5
        const winnersData = tiers.map((tier) => ({
          address: winners[tier],
          amountLamports: Math.floor(payouts[tier] * LAMPORTS_PER_SOL),
          tier: tier
        }))

        const swapTransactions = await jupiterService.buildMultipleSwapTransactions(
          winnersData,
          slippage
        )

        const totalAmountSOL = tiers.reduce((sum, t) => sum + payouts[t], 0)
        const totalExpectedLotto = swapTransactions.reduce(
          (sum, tx) => sum + jupiterService.formatLottoAmount(tx.expectedLottoAmount),
          0
        )

        console.log(`\n✅ Jupiter swap transactions prepared`)
        console.log(`   Total Input: ${totalAmountSOL.toFixed(6)} SOL`)
        console.log(`   Expected Output: ${totalExpectedLotto.toFixed(6)} LOTTO`)
        console.log(`   Transactions: ${swapTransactions.length}`)

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')

        return res.json({
          swapMode: true,
          swapTransactions: swapTransactions.map((tx) => ({
            transaction: tx.transaction,
            tier: tx.tier,
            winnerAddress: tx.winnerAddress,
            expectedLottoAmount: jupiterService.formatLottoAmount(tx.expectedLottoAmount),
            priceImpact: tx.priceImpactPct
          })),
          blockhash,
          lastValidBlockHeight: Math.min(...swapTransactions.map(tx => tx.lastValidBlockHeight)),
          winners: tiers.map(t => ({
            tier: t,
            address: winners[t],
            amountSOL: payouts[t]
          })),
          totalAmountSOL,
          totalExpectedLotto,
          message: 'Please sign these Jupiter swap transactions to distribute LOTTO prizes'
        })
      } catch (swapError: any) {
        const details = swapError?.message || String(swapError)
        console.error(`❌ Failed to build swap transactions:`, details)

        if (!confirmFallback) {
          const totalAmountSOL = tiers.reduce((sum, t) => sum + payouts[t], 0)
          return res.status(502).json({
            error: 'SWAP_PREPARE_FAILED',
            details,
            action: 'CONFIRM_SOL_FALLBACK',
            message: 'Jupiter swap preparation failed. Confirm to fallback to SOL distribution.',
            fallbackProposal: {
              winners: tiers.map(t => ({ tier: t, address: winners[t], amountSOL: payouts[t] })),
              totalAmountSOL
            }
          })
        }
        // If confirmFallback is true, proceed to SOL build below
      }
    }

    // OPTION 2: Build Standard SOL Transfer Transaction (Default or Fallback)
    console.log(`\n💰 Building SOL transfer transaction...`)

    // Get latest blockhash for transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')

    // Build transfer instructions for all winners
    const transaction = new Transaction({
      feePayer: fromPubkey,
      recentBlockhash: blockhash,
    })

    let totalAmountSOL = 0
    for (const tier of tiers) {
      const winnerAddress = winners[tier]
      const amountSOL = payouts[tier]
      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)

      totalAmountSOL += amountSOL

      const toPubkey = new PublicKey(winnerAddress)

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amountLamports,
        })
      )

      console.log(`   ${tier.toUpperCase()}: ${amountSOL} SOL → ${winnerAddress.slice(0, 8)}...`)
    }

    // Serialize transaction for frontend (unsigned)
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64')

    console.log(`\n✅ SOL transaction prepared with ${tiers.length} transfers`)
    console.log(`   Total Distribution: ${totalAmountSOL.toFixed(6)} SOL`)
    console.log(`   Blockhash: ${blockhash.slice(0, 16)}...`)
    console.log(`   Valid until block: ${lastValidBlockHeight}`)

    return res.json({
      swapMode: false,
      transaction: serializedTx,
      blockhash,
      lastValidBlockHeight,
      winners: tiers.map(t => ({
        tier: t,
        address: winners[t],
        amount: payouts[t]
      })),
      totalAmount: totalAmountSOL,
      message: 'Please sign this transaction in your wallet to distribute SOL prizes'
    })
  } catch (e) {
    console.error('distribution/prepare failed', e)
    return res.status(500).json({
      error: 'Failed to prepare transaction',
      details: e instanceof Error ? e.message : String(e)
    })
  }
})

// POST /distribution/broadcast - Broadcasts signed transaction(s) from frontend
router.post('/broadcast', requireJwt, async (req, res) => {
  try {
    const {
      roundId,
      signedTransaction,
      signedSwapTransactions,
      swapMode,
      swapToLotto,
      blockhash,
      lastValidBlockHeight
    } = req.body || {}

    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })

    console.log(`\n📡 Broadcasting distribution transaction(s) for round ${roundId}`)
    console.log(`   Swap Mode: ${swapMode ? 'Yes' : 'No'}`)
    console.log(`   Swap to LOTTO: ${swapToLotto ? 'Yes' : 'No'}`)

    const rpcService = getRPCService()
    const connection = rpcService.getConnection()

    let allSignatures: string[] = []
    let actuallySwapped = false
    let swapError: string | null = null

    // OPTION 1: Handle Jupiter Swap Transactions
    if (swapMode && signedSwapTransactions && signedSwapTransactions.length > 0) {
      console.log(`\n🔄 Broadcasting ${signedSwapTransactions.length} Jupiter swap transaction(s)...`)

      try {
        for (let i = 0; i < signedSwapTransactions.length; i++) {
          const { transaction: signedTx, tier, winnerAddress } = signedSwapTransactions[i]

          console.log(`   Processing ${tier}: ${winnerAddress.slice(0, 8)}...`)

          // Send transaction
          const txBuffer = Buffer.from(signedTx, 'base64')
          let signature: string

          try {
            signature = await connection.sendRawTransaction(txBuffer, {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
              maxRetries: 3,
            })
          } catch (sendErr: any) {
            const msg = sendErr instanceof Error ? sendErr.message : String(sendErr)
            if (/block hash|blockhash|block height exceeded|expired/i.test(msg)) {
              console.warn(`   Swap ${tier} failed: Blockhash expired`)
              throw new Error('BLOCKHASH_EXPIRED')
            }
            throw sendErr
          }

          console.log(`   ${tier} signature: ${signature}`)

          // Confirm transaction
          let confirmed = false
          const tryConfirm = async () => {
            try {
              const c = await connection.confirmTransaction(
                {
                  signature,
                  blockhash,
                  lastValidBlockHeight,
                },
                'confirmed'
              )
              return c
            } catch (e) {
              return { value: { err: 'confirmTransaction threw' } } as any
            }
          }

          let confirmation = await tryConfirm()
          if (!confirmation?.value?.err && confirmation?.value) {
            confirmed = true
          }

          if (!confirmed) {
            // Fallback: poll getSignatureStatuses for up to 60s
            const start = Date.now()
            const timeoutMs = 60000
            while (Date.now() - start < timeoutMs) {
              const statuses = await connection.getSignatureStatuses([signature])
              const status = statuses.value[0]
              if (status) {
                if (status.err) {
                  throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
                }
                if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                  confirmed = true
                  break
                }
              }
              await new Promise((r) => setTimeout(r, 1500))
            }
          }

          if (!confirmed) {
            throw new Error(`Swap transaction ${tier} not confirmed within timeout`)
          }

          allSignatures.push(signature)
          console.log(`   ✅ ${tier} swap confirmed`)
        }

        actuallySwapped = true
        console.log(`\n✅ All Jupiter swap transactions completed successfully!`)

      } catch (swapErr: any) {
        const errMsg = swapErr instanceof Error ? swapErr.message : String(swapErr)
        console.error(`❌ Jupiter swap failed:`, errMsg)
        swapError = errMsg

        // Check if this is a blockhash expiration error
        if (errMsg.includes('BLOCKHASH_EXPIRED') || /block hash|blockhash|block height exceeded|expired/i.test(errMsg)) {
          return res.status(409).json({
            error: 'BLOCKHASH_EXPIRED',
            details: errMsg,
            action: 'RETRY_PREPARE_AND_RESIGN',
          })
        }

        // For other swap errors, return error and suggest fallback to SOL
        return res.status(500).json({
          error: 'SWAP_FAILED',
          details: errMsg,
          action: 'FALLBACK_TO_SOL',
          message: 'Jupiter swap failed. Please retry with SOL distribution instead.',
          partialSignatures: allSignatures.length > 0 ? allSignatures : undefined
        })
      }
    }

    // OPTION 2: Handle Standard SOL Transfer Transaction
    else if (signedTransaction) {
      console.log(`\n💰 Broadcasting SOL transfer transaction...`)

      const txBuffer = Buffer.from(signedTransaction, 'base64')
      let signature: string

      try {
        signature = await connection.sendRawTransaction(txBuffer, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        })
      } catch (sendErr: any) {
        const msg = sendErr instanceof Error ? sendErr.message : String(sendErr)
        if (/block hash|blockhash|block height exceeded|expired/i.test(msg)) {
          console.warn('SOL transfer failed: Blockhash expired')
          return res.status(409).json({
            error: 'BLOCKHASH_EXPIRED',
            details: msg,
            action: 'RETRY_PREPARE_AND_RESIGN',
          })
        }
        throw sendErr
      }

      console.log(`   Transaction signature: ${signature}`)

      // Confirm transaction
      const tryConfirm = async () => {
        try {
          const c = await connection.confirmTransaction(
            {
              signature,
              blockhash,
              lastValidBlockHeight,
            },
            'confirmed'
          )
          return c
        } catch (e) {
          return { value: { err: 'confirmTransaction threw' } } as any
        }
      }

      let confirmed = false
      let confirmation = await tryConfirm()
      if (!confirmation?.value?.err && confirmation?.value) {
        confirmed = true
      }

      if (!confirmed) {
        // Fallback: poll getSignatureStatuses for up to 60s
        const start = Date.now()
        const timeoutMs = 60000
        while (Date.now() - start < timeoutMs) {
          const statuses = await connection.getSignatureStatuses([signature])
          const status = statuses.value[0]
          if (status) {
            if (status.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
            }
            if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
              confirmed = true
              break
            }
          }
          await new Promise((r) => setTimeout(r, 1500))
        }
      }

      if (!confirmed) {
        return res.status(202).json({
          pending: true,
          signature,
          message: 'Broadcast accepted but not yet confirmed; keep polling status',
        })
      }

      allSignatures = [signature]
      console.log(`   ✅ SOL transfer confirmed`)
    } else {
      return res.status(400).json({
        error: 'Missing transaction data',
        details: 'Either signedTransaction or signedSwapTransactions must be provided'
      })
    }

    // Capture blockchain state for audit trail
    const slot = await connection.getSlot()

    // Update round with distribution data
    const distributionDate = new Date()
    await prisma.round.update({
      where: { id: roundId },
      data: {
        distributionDate,
        distributionTxSignatures: allSignatures,
        swapToLotto: actuallySwapped
      }
    })

    console.log(`\n✅ Distribution complete!`)
    console.log(`   Mode: ${actuallySwapped ? 'LOTTO (via Jupiter)' : 'SOL'}`)
    console.log(`   Transactions: ${allSignatures.length}`)
    console.log(`   Slot: ${slot}`)
    console.log(`   Released at: ${distributionDate.toISOString()}`)

    return res.json({
      success: true,
      swapped: actuallySwapped,
      signature: allSignatures[0],
      txSignatures: allSignatures,
      releasedAt: distributionDate.toISOString(),
      audit: {
        blockhash,
        slot
      }
    })
  } catch (e) {
    console.error('distribution/broadcast failed', e)
    const msg = e instanceof Error ? e.message : String(e)
    if (/block hash|blockhash|block height exceeded|expired/i.test(msg)) {
      return res.status(409).json({
        error: 'BLOCKHASH_EXPIRED',
        details: msg,
        action: 'RETRY_PREPARE_AND_RESIGN'
      })
    }
    return res.status(500).json({
      error: 'Failed to broadcast transaction',
      details: msg,
    })
  }
})

export default router
