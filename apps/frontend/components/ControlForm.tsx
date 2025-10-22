// ControlForm.tsx
// This component handles the configuration of lottery parameters (Control Module)
// Styled to match the dashboard dark theme.

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfigSchema, ConfigSchemaType } from '@/lib/zodSchemas'
import { useModuleStore } from '@/hooks/useModuleStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { createConfig } from '@/lib/api'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DateTimePicker from '@/components/ui/date-time-picker'
import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HelperText } from '@/components/ui/helper-text'
import { CheckCircle2 } from 'lucide-react'

export const ControlForm = () => {
  const { jwt } = useAuthStore()
  const { controlEnabled, controlSubmitted, setControlSubmitted, setParticipantCounts, setControlConfig, setPrizePoolSol, setRoundId } = useModuleStore()
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  // Compute default window: previous Sunday 6:01 PM to current (upcoming or same) Sunday 6:00 PM
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const computeDefaultWindow = () => {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday
    const daysUntilSunday = (7 - day) % 7 // 0 if Sunday today, else days until upcoming Sunday
    const currentSunday = new Date(now)
    currentSunday.setDate(now.getDate() + daysUntilSunday)
    currentSunday.setHours(18, 0, 0, 0) // 6:00 PM local

    const previousSunday = new Date(currentSunday)
    previousSunday.setDate(previousSunday.getDate() - 7)
    previousSunday.setHours(18, 1, 0, 0) // 6:01 PM local

    return { start: toLocalInput(previousSunday), end: toLocalInput(currentSunday) }
  }

  const defaults = computeDefaultWindow()

  const form = useForm<ConfigSchemaType>({
    resolver: zodResolver(ConfigSchema),
    defaultValues: {
      tradeThresholdPercent: 50,
      prizeDistributionPercent: 70,
      blacklistedWallets: '',
      startDate: defaults.start,
      endDate: defaults.end,
      slippageTolerancePercent: 0.5,
    },
  })

  const onSubmit = async (data: ConfigSchemaType) => {
    try {
      if (!publicKey) {
        alert('Connect wallet to configure prize distribution.')
        return
      }

      console.log('[ControlForm] Fetching wallet balance for:', publicKey.toBase58())
      const balanceLamports = await connection.getBalance(publicKey)
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL
      console.log('[ControlForm] Wallet balance:', balanceSol, 'SOL')

      const prizeDistributionPercent = data.prizeDistributionPercent
      const prizePoolSol = Number((balanceSol * (prizeDistributionPercent / 100)).toFixed(6))

      const payload = {
        ...data,
        prizeDistributionPercent,
        prizeSourceWallet: publicKey.toBase58(),
        prizeSourceBalanceSol: balanceSol,
      }

      console.log('[ControlForm] Submitting config with payload:', JSON.stringify(payload, null, 2))
      const resp = await createConfig(payload, jwt || '')
      setControlSubmitted(true)
      setControlConfig({
        startDate: data.startDate,
        endDate: data.endDate,
        tradeThresholdPercent: data.tradeThresholdPercent,
        prizeDistributionPercent,
        slippageTolerancePercent: data.slippageTolerancePercent,
      })
      setPrizePoolSol(resp?.prizePoolSol ?? prizePoolSol)
      if (resp?.roundId) setRoundId(resp.roundId)
      // Participant counts will be set after snapshot confirmation
      setParticipantCounts(null)
    } catch (error: any) {
      console.error('Config creation failed:', error)

      // Try to extract the actual error message from the API response
      let errorMessage = 'Invalid parameters or server error. Please review inputs and try again.'

      if (error?.message) {
        // The error message from api.ts will contain the response text
        errorMessage = error.message

        // Try to parse it as JSON to get more details
        try {
          const match = error.message.match(/Failed to submit config: (.+)/)
          if (match && match[1]) {
            const parsed = JSON.parse(match[1])
            if (parsed.error) {
              errorMessage = `Error: ${parsed.error}`
              if (parsed.message) errorMessage += `\n${parsed.message}`
              if (parsed.issues) {
                errorMessage += '\n\nValidation issues:\n' + parsed.issues.map((i: any) => `- ${i.path}: ${i.message}`).join('\n')
              }
              if (parsed.provided !== undefined && parsed.actual !== undefined) {
                errorMessage += `\n\nProvided: ${parsed.provided} SOL\nActual: ${parsed.actual} SOL`
              }
            }
          }
        } catch {
          // If parsing fails, just use the error message as-is
        }
      }

      alert(errorMessage)
    }
  }

  const onInvalid = () => {
    alert('Please correct the highlighted fields.')
    // Clear validation errors but keep current values intact
    form.clearErrors()
    // Optionally focus the first field
    form.setFocus('startDate')
  }

  if (!controlEnabled) return null

  return (
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-6 shadow-panel">
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 grid gap-4 sm:gap-5">
        {/* Start Date */}
        <div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="startDate" className="text-slate-300 text-xs md:text-sm">Start Date</Label>
          <div>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <DateTimePicker value={field.value} onChange={field.onChange} className="h-8 w-full px-2.5 py-1.5 text-[10px] md:text-[12px]" />
              )}
            />
            {form.formState.errors.startDate && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.startDate.message}</p>
            )}
          </div>
        </div>

        {/* End Date */}
        <div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="endDate" className="text-slate-300 text-xs md:text-sm">End Date</Label>
          <div>
            <Controller
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <DateTimePicker value={field.value} onChange={field.onChange} className="h-8 w-full px-2.5 py-1.5 text-[10px] md:text-[12px]" />
              )}
            />
            {form.formState.errors.endDate && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Trade Threshold (%) */}
        <div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="tradeThresholdPercent" className="text-slate-300 text-xs md:text-sm">Trade Threshold (%)</Label>
          <div>
            <Input
              id="tradeThresholdPercent"
              className="w-full rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
              type="number"
              step="0.01"
              {...form.register('tradeThresholdPercent', { valueAsNumber: true })}
            />
            {form.formState.errors.tradeThresholdPercent && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.tradeThresholdPercent.message}</p>
            )}
          </div>
        </div>

        {/* Prize Distribution (%) */}
        <div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="prizeDistributionPercent" className="text-slate-300 text-xs md:text-sm">Prize Distribution (%)</Label>
          <div>
            <Input
              id="prizeDistributionPercent"
              className="w-full rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
              type="number"
              step="0.01"
              {...form.register('prizeDistributionPercent', { valueAsNumber: true })}
            />
            {form.formState.errors.prizeDistributionPercent && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.prizeDistributionPercent.message}</p>
            )}
          </div>
        </div>

        {/* Slippage Tolerance (%) */}
        <div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="slippageTolerancePercent" className="text-slate-300 text-xs md:text-sm">Slippage Tolerance (%)</Label>
          <div>
            <Input
              id="slippageTolerancePercent"
              className="w-full rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
              type="number"
              step="0.01"
              {...form.register('slippageTolerancePercent', { valueAsNumber: true })}
            />
            {form.formState.errors.slippageTolerancePercent && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.slippageTolerancePercent.message}</p>
            )}
          </div>
        </div>

        {/* Blacklisted Wallets */}
        <div className="grid items-start gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
          <Label htmlFor="blacklistedWallets" className="mt-1 text-slate-300 text-xs md:text-sm">Blacklisted Wallets (optional)</Label>
          <div>
            <Textarea
              id="blacklistedWallets"
              className="w-full min-h-[60px] sm:min-h-[80px] rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
              placeholder="Enter comma-separated wallet addresses"
              {...form.register('blacklistedWallets')}
            />
            {form.formState.errors.blacklistedWallets && (
              <p className="mt-1 text-red-400 text-xs sm:text-sm">{form.formState.errors.blacklistedWallets.message}</p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={controlSubmitted}
            className={`w-full sm:w-auto rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
              controlSubmitted
                ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
                : 'bg-badge-gradient text-white'
            }`}
          >
            {controlSubmitted ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Configuration Submitted
              </span>
            ) : (
              'Configure Parameters'
            )}
          </Button>
        </div>
      </form>

      {/* Helper Text */}
      {!controlSubmitted && (
        <HelperText variant="info">
          Configure lottery parameters and click submit to proceed to the Snapshot module.
        </HelperText>
      )}
      {controlSubmitted && (
        <HelperText variant="success">
          Configuration saved successfully! Proceed to the Snapshot module.
        </HelperText>
      )}
    </section>
  )
}

export default ControlForm;

