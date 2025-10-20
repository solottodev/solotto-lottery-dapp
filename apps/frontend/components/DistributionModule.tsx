"use client";

import { useMemo, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { prepareDistribution, broadcastDistribution } from '@/lib/api'
import { HelperText } from '@/components/ui/helper-text'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { IndeterminateProgressBar } from '@/components/ui/progress-bar'
import { CheckCircle2 } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction, VersionedTransaction } from '@solana/web3.js'

const formatSol = (n: number) => `${n.toFixed(6)} SOL`

export default function DistributionModule() {
  const { jwt } = useAuthStore()
  const { publicKey, signTransaction } = useWallet()
  const {
    harvestStatus,
    allocations,
    winners,
    swapToLotto,
    setSwapToLotto,
    controlConfig,
    participantCounts,
    prizePoolSol,
    drawingStartedAt,
    drawingCompletedAt,
    distributionStatus,
    setDistributionStatus,
    setDistributionDate,
    roundId,
    harvestAudit,
    setHarvestAudit,
    upsertHistoryRound,
    setHistoryParticipants,
  } = useModuleStore()

  const [error, setError] = useState<string | null>(null)
  const [fallbackInfo, setFallbackInfo] = useState<null | { winners: Array<{ tier: string; address: string; amountSOL: number }>; totalAmountSOL: number }>(null)
  const [showFallbackModal, setShowFallbackModal] = useState(false)
  const [lastPreparePayload, setLastPreparePayload] = useState<any>(null)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const ready = harvestStatus === 'prepared'
  const canRelease = ready && distributionStatus !== 'releasing' && distributionStatus !== 'released'
  const isReleased = distributionStatus === 'released'
  const slippage = controlConfig?.slippageTolerancePercent ?? 0.5
  const resetWorkflow = useModuleStore((state) => state.resetWorkflow)

  const rows = useMemo(() => (
    [
      { tier: 'TIER 1', tierKey: 't1', addr: winners.t1, amount: allocations.t1 },
      { tier: 'TIER 2', tierKey: 't2', addr: winners.t2, amount: allocations.t2 },
      { tier: 'TIER 3', tierKey: 't3', addr: winners.t3, amount: allocations.t3 },
      { tier: 'TIER 4', tierKey: 't4', addr: winners.t4, amount: allocations.t4 },
    ]
  ), [winners, allocations])

  const getTierTxSignature = (tierKey: string): string | null => {
    if (!harvestAudit?.txSignatures || harvestAudit.txSignatures.length === 0) return null

    // Check if this tier has a winner
    const tierIndex = ['t1', 't2', 't3', 't4'].indexOf(tierKey)
    const hasWinner = rows[tierIndex]?.addr

    if (!hasWinner) return null

    // In SOL mode: single transaction for all winners (length = 1)
    // In swap mode: one transaction per winner (length = number of winners)
    if (harvestAudit.txSignatures.length === 1) {
      // SOL mode - all winners share the same transaction
      return harvestAudit.txSignatures[0]
    }

    // Swap mode - map each winner to their transaction by position
    // Count how many winners exist before this tier
    let sigIndex = 0
    for (let i = 0; i < tierIndex; i++) {
      if (rows[i]?.addr) sigIndex++
    }

    return harvestAudit.txSignatures[sigIndex] || null
  }

  const getSolscanUrl = (signature: string): string => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
    return `https://solscan.io/tx/${signature}${cluster}`
  }

  const exportCSV = () => {
    const headers = ['Tier', 'Winner', 'Prize Amount (SOL)', 'Transaction Signature', 'Solscan URL']
    const csvRows = rows.map((r) => {
      const txSig = getTierTxSignature(r.tierKey)
      const solscanUrl = txSig ? getSolscanUrl(txSig) : ''
      return [
        r.tier,
        r.addr || '',
        (r.amount || 0).toFixed(6),
        txSig || '',
        solscanUrl
      ]
    })
    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `distribution_${roundId || 'preview'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const onRelease = async () => {
    setError(null)
    if (!canRelease) return

    console.log('🔍 Distribution Debug:', { roundId, jwt: !!jwt, swapToLotto })

    if (!roundId) {
      setError(`Round ID is missing. Current value: ${roundId}`)
      console.error('❌ Round ID is null/undefined')
      return
    }

    if (!jwt) {
      setError('Operator authentication required')
      return
    }

    if (!publicKey) {
      setError('Wallet not connected - please connect your wallet')
      return
    }

    if (!signTransaction) {
      setError('Wallet does not support transaction signing')
      return
    }

    try {
      setDistributionStatus('releasing')
      let txs: string[] = []
      let audit: any = null
      let ataAddrs: Record<string, string> = {}
      let actuallySwapped = false

      try {
        // Step 1: Prepare the distribution transaction(s)
        console.log('📡 Preparing distribution transaction with:', {
          roundId,
          operatorWallet: publicKey.toBase58(),
          swapToLotto,
          slippage: slippage
        })

        const preparePayload = {
          roundId,
          operatorWalletAddress: publicKey.toBase58(),
          swapToLotto,
          slippagePercent: slippage
        }
        setLastPreparePayload(preparePayload)

        const prepareRes = await prepareDistribution(jwt, preparePayload)
        console.log('✅ Transaction prepared:', prepareRes)

        // Step 2: Handle Swap Mode (Multiple transactions)
        if (prepareRes.swapMode && prepareRes.swapTransactions && prepareRes.swapTransactions.length > 0) {
          console.log(`🔄 Swap mode enabled - signing ${prepareRes.swapTransactions.length} Jupiter swap transactions...`)

          const signedSwapTxs: Array<{ transaction: string; tier: string; winnerAddress: string }> = []

          // Sign each swap transaction
          for (const swapTx of prepareRes.swapTransactions) {
            console.log(`   Signing ${swapTx.tier} swap for ${swapTx.winnerAddress.slice(0, 8)}...`)

            // Deserialize versioned transaction
            const txBuffer = Buffer.from(swapTx.transaction, 'base64')
            const versionedTx = VersionedTransaction.deserialize(txBuffer)

            // Sign with Phantom
            const signedTx = await signTransaction(versionedTx)

            // Serialize signed transaction
            const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')

            signedSwapTxs.push({
              transaction: signedTxBase64,
              tier: swapTx.tier,
              winnerAddress: swapTx.winnerAddress
            })

            console.log(`   ✅ ${swapTx.tier} signed`)
          }

          // Step 3: Broadcast all signed swap transactions
          console.log('📡 Broadcasting signed swap transactions...')
          const broadcastRes = await broadcastDistribution(jwt, {
            roundId,
            signedSwapTransactions: signedSwapTxs,
            swapMode: true,
            swapToLotto: true,
            blockhash: prepareRes.blockhash,
            lastValidBlockHeight: prepareRes.lastValidBlockHeight
          })
          console.log('✅ Swap distribution broadcast response:', broadcastRes)

          txs = broadcastRes.txSignatures || [broadcastRes.signature]
          audit = broadcastRes.audit || null
          actuallySwapped = broadcastRes.swapped || false
          ataAddrs = {}
        }
        // Step 2: Handle SOL Mode (Single transaction)
        else if (prepareRes.transaction) {
          console.log('💰 SOL mode - signing single transfer transaction...')

          // Deserialize and sign the transaction with Phantom
          const txBuffer = Buffer.from(prepareRes.transaction, 'base64')
          const transaction = Transaction.from(txBuffer)

          console.log('🔐 Requesting wallet signature...')
          const signedTx = await signTransaction(transaction)

          // Serialize signed transaction
          const signedTxBase64 = signedTx.serialize().toString('base64')

          // Broadcast the signed transaction
          console.log('📡 Broadcasting signed transaction...')
          const broadcastRes = await broadcastDistribution(jwt, {
            roundId,
            signedTransaction: signedTxBase64,
            swapMode: false,
            swapToLotto: false,
            blockhash: prepareRes.blockhash,
            lastValidBlockHeight: prepareRes.lastValidBlockHeight
          })
          console.log('✅ SOL distribution broadcast response:', broadcastRes)

          txs = broadcastRes.txSignatures || [broadcastRes.signature]
          audit = broadcastRes.audit || null
          actuallySwapped = false
          ataAddrs = {}
        } else {
          throw new Error('Invalid prepare response - no transaction data')
        }
      } catch (err: any) {
        console.error('❌ Distribution error:', err)

        // Handle swap failure with fallback suggestion
        if (err.shouldFallback) {
          setError(`Jupiter swap failed: ${err.details || err.message}. Please uncheck "Swap SOL to LOTTO" and retry with SOL distribution.`)
          setDistributionStatus('queued')
          return
        }

        // Handle confirmation-gated fallback from prepare
        if ((err as any).requiresFallbackConfirm && (err as any).fallbackProposal) {
          setFallbackInfo((err as any).fallbackProposal)
          setShowFallbackModal(true)
          setDistributionStatus('queued')
          return
        }

        throw err
      }
      const distributionIso = new Date().toISOString()
      const totalParticipants = participantCounts ? (participantCounts.t1 + participantCounts.t2 + participantCounts.t3 + participantCounts.t4) : null
      const eligibleParticipants = totalParticipants
      const historyId = roundId || `preview-${Date.now().toString(36)}`

      setDistributionStatus('released')
      setDistributionDate(distributionIso)
      setHarvestAudit({
        ...(harvestAudit || {}),
        txSignatures: txs,
        ataAddresses: ataAddrs,
        ...(audit ? { blockhash: audit.blockhash, slot: audit.slot } : {})
      })
      upsertHistoryRound({
        id: historyId,
        drawingDate: drawingCompletedAt || drawingStartedAt || null,
        distributionDate: distributionIso,
        prizePoolSol,
        totalParticipants: totalParticipants ?? null,
        eligibleParticipants: eligibleParticipants ?? null,
        tierWinners: winners,
        tierPayouts: allocations,
        txSignatures: txs,
        swapToLotto: actuallySwapped,
        isLocal: true,
      })
      const participantsPreview = (['t1','t2','t3','t4'] as const).map((tierKey) => {
        const wallet = winners[tierKey]
        if (!wallet) return null
        const payout = allocations[tierKey] ?? 0
        return {
          roundId: historyId,
          wallet,
          lottoUsdValue: payout * 1,
          tier: tierKey.toUpperCase(),
          percentTraded: controlConfig?.tradeThresholdPercent ?? null,
          isWinner: true,
          drawingDate: drawingCompletedAt || drawingStartedAt || null,
          distributionTx: txs[0] || null,
        }
      }).filter(Boolean) as any
      if (participantsPreview.length > 0) {
        setHistoryParticipants(historyId, participantsPreview, 'local')
      }

      try {
        if (roundId) {
          await fetch(`/api/history/round/${encodeURIComponent(roundId)}/audit/distribution`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            },
            body: JSON.stringify({
              txSignatures: txs,
              ataAddresses: harvestAudit?.ataAddresses || {},
              swapToLotto,
              routeId: null,
              slippage: controlConfig?.slippageTolerancePercent ?? null,
            }),
          })
        }
      } catch (_) {}
    } catch (e: any) {
      setError(e?.message || 'Failed to release')
      setDistributionStatus('queued')
    }
  }

  const handleCompleteRound = () => {
    // Reset the workflow to start a new round
    resetWorkflow()
    // Optionally scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className={`rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 shadow-panel ${!ready ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Progress Bar - shown during fund release */}
      {distributionStatus === 'releasing' && (
        <div className="mb-4">
          <IndeterminateProgressBar label="Releasing funds to winners and recording transactions..." />
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-slate-300 text-xs sm:text-sm">Release Plan</div>
          <div className="text-primary font-semibold text-sm sm:text-base">{distributionStatus === 'released' ? 'Released' : 'Ready'}</div>
          <div className="mt-1 text-[10px] sm:text-xs text-slate-400 truncate">Prize Pool: <span className="text-primary font-semibold">{formatSol(prizePoolSol)}</span></div>
        </div>
        <div className="w-full sm:w-auto sm:max-w-[40%] min-w-0 text-left sm:text-right text-[10px] sm:text-xs text-slate-400 space-y-0.5">
          {harvestAudit?.slot !== undefined && <div className="truncate">Slot: {harvestAudit.slot}</div>}
          {harvestAudit?.txSignatures && harvestAudit.txSignatures.length > 0 && (
            <div className="truncate" title={harvestAudit.txSignatures.join(', ')}>Tx: {harvestAudit.txSignatures[0]?.slice(0, 8)}...{harvestAudit.txSignatures.length > 1 ? ` +${harvestAudit.txSignatures.length - 1}` : ''}</div>
          )}
          {harvestAudit?.ataAddresses && (
            <div className="truncate">ATAs: {Object.keys(harvestAudit.ataAddresses).length}</div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((r) => {
          const txSig = getTierTxSignature(r.tierKey)
          const solscanUrl = txSig ? getSolscanUrl(txSig) : null
          return (
            <div key={r.tier} className="rounded-lg border border-primary/20 bg-night-900/60 p-3 sm:p-4 min-w-0">
              <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-400">{r.tier}</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-300">Winner</div>
              <div className="text-sm sm:text-base font-semibold text-primary truncate" title={r.addr || '—'}>{r.addr || '—'}</div>
              {txSig && solscanUrl && (
                <div className="mt-1 text-[10px] sm:text-xs text-slate-400 truncate">
                  Transaction: <a href={solscanUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" title={txSig}>{txSig.slice(0, 8)}...{txSig.slice(-8)}</a>
                </div>
              )}
              <div className="mt-2 text-[10px] sm:text-xs text-slate-400">Prize Amount</div>
              <div className="text-primary font-semibold text-sm sm:text-base truncate">
                {formatSol(r.amount || 0)}
                {isReleased ? '' : swapToLotto ? ' → LOTTO (pending swap)' : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <label className="inline-flex items-center gap-2 text-slate-300 text-xs sm:text-sm">
          <input type="checkbox" checked={swapToLotto} onChange={(e) => setSwapToLotto(e.target.checked)} />
          Swap SOL to LOTTO before distribution
        </label>
        <div className="text-[10px] sm:text-xs text-slate-400">Slippage tolerance: {slippage}%</div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-xs sm:text-sm">{error}</div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => setShowReleaseModal(true)}
          disabled={!canRelease}
          className={`w-full sm:w-auto rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isReleased
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'bg-badge-gradient text-white disabled:opacity-60'
          }`}
        >
          {isReleased ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Funds Released
            </span>
          ) : distributionStatus === 'releasing' ? (
            'Releasing…'
          ) : (
            'Release Funds'
          )}
        </Button>
        {distributionStatus === 'released' && (
          <>
            <Button
              type="button"
              onClick={exportCSV}
              className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary shadow-md"
            >
              Export Distribution CSV
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!roundId) {
                  setError('Round ID is missing')
                  return
                }
                // Trigger download of full consolidated CSV
                const url = `/api/history/export/round/${roundId}/full`
                window.location.href = url
              }}
              className="w-full sm:w-auto rounded-lg bg-badge-gradient px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md"
            >
              Export Full CSV
            </Button>
            <Button
              type="button"
              onClick={() => setShowCompleteModal(true)}
              className="w-full sm:w-auto rounded-lg border-2 border-green-500/50 bg-green-600/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-green-300 shadow-md hover:bg-green-600/30 transition-colors"
            >
              Complete Round & Start New
            </Button>
          </>
        )}
      </div>

      {/* Helper Text */}
      {!ready && (
        <HelperText variant="info">
          Complete and prepare Harvest to enable distribution.
        </HelperText>
      )}
      {ready && distributionStatus !== 'released' && (
        <HelperText variant="info">
          Configure swap options and click &quot;Release Funds&quot; to distribute prizes to winners.
        </HelperText>
      )}
      {isReleased && (
        <HelperText variant="success">
          Funds released successfully! Export reports, view the complete round data in History, or click &quot;Complete Round & Start New&quot; to begin the next lottery round.
        </HelperText>
      )}

      {/* Confirmation Modal for Release */}
      <ConfirmationModal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        onConfirm={onRelease}
        title="Release Prize Funds"
        message={`You are about to release ${formatSol(prizePoolSol)} to ${Object.values(winners).filter(Boolean).length} winners${swapToLotto ? ' (swapping SOL to LOTTO before distribution)' : ''}. This action will execute on-chain transactions and cannot be undone. Are you sure you want to proceed?`}
        confirmText="Release Funds"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Confirmation Modal for SOL Fallback */}
      <ConfirmationModal
        isOpen={showFallbackModal}
        onClose={() => setShowFallbackModal(false)}
        onConfirm={async () => {
          if (!jwt || !lastPreparePayload) return
          try {
            setError(null)
            setDistributionStatus('releasing')
            const prepareRes = await prepareDistribution(jwt, { ...lastPreparePayload, confirmFallback: true })
            console.log('✅ Fallback confirmed. SOL transaction prepared:', prepareRes)

            if (prepareRes.transaction) {
              const txBuffer = Buffer.from(prepareRes.transaction, 'base64')
              const transaction = Transaction.from(txBuffer)
              const signedTx = await signTransaction!(transaction)
              const signedTxBase64 = signedTx.serialize().toString('base64')
              const broadcastRes = await broadcastDistribution(jwt, {
                roundId: lastPreparePayload.roundId,
                signedTransaction: signedTxBase64,
                swapMode: false,
                swapToLotto: false,
                blockhash: prepareRes.blockhash,
                lastValidBlockHeight: prepareRes.lastValidBlockHeight
              })

              const txs = broadcastRes.txSignatures || [broadcastRes.signature]
              const audit = broadcastRes.audit || null
              const distributionIso = new Date().toISOString()

              setDistributionStatus('released')
              setDistributionDate(distributionIso)
              setHarvestAudit({
                ...(harvestAudit || {}),
                txSignatures: txs,
                ataAddresses: {},
                ...(audit ? { blockhash: audit.blockhash, slot: audit.slot } : {})
              })

              const historyId = lastPreparePayload.roundId || `preview-${Date.now().toString(36)}`
              upsertHistoryRound({
                id: historyId,
                drawingDate: drawingCompletedAt || drawingStartedAt || null,
                distributionDate: distributionIso,
                prizePoolSol,
                totalParticipants: participantCounts ? (participantCounts.t1 + participantCounts.t2 + participantCounts.t3 + participantCounts.t4) : null,
                eligibleParticipants: participantCounts ? (participantCounts.t1 + participantCounts.t2 + participantCounts.t3 + participantCounts.t4) : null,
                tierWinners: winners,
                tierPayouts: allocations,
                txSignatures: txs,
                swapToLotto: false,
                isLocal: true,
              })
            } else {
              setError('Fallback failed: no SOL transaction prepared')
              setDistributionStatus('queued')
            }
          } catch (e: any) {
            console.error('❌ Fallback confirmation failed:', e)
            setError(e?.message || 'Fallback confirmation failed')
            setDistributionStatus('queued')
          }
        }}
        title="Confirm SOL Fallback"
        message={(() => {
          if (!fallbackInfo) return 'Jupiter swap failed. Confirm to distribute SOL directly.'
          const lines = [
            'Jupiter swap preparation failed. Confirm to distribute SOL directly to winners.',
            '',
            'Proposed SOL distribution:',
            ...fallbackInfo.winners.map(w => `${w.tier.toUpperCase()}: ${w.amountSOL.toFixed(6)} SOL → ${w.address}`),
            '',
            `Total: ${fallbackInfo.totalAmountSOL.toFixed(6)} SOL`
          ]
          return lines.join('\n')
        })()}
        confirmText="Confirm SOL Fallback"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Confirmation Modal for Complete Round */}
      <ConfirmationModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteRound}
        title="Complete Round & Start New"
        message={`This will mark the current lottery round as complete and reset the workflow to start a new round. All current round data has been saved to History. This action will clear the current session state. Are you sure you want to complete this round and start fresh?`}
        confirmText="Complete Round"
        cancelText="Cancel"
        variant="warning"
      />
    </section>
  )
}
