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

export const ControlForm = () => {
  const { jwt } = useAuthStore()
  const { controlEnabled, setControlSubmitted, setParticipantCounts, setControlConfig, setPrizePoolSol, setRoundId } = useModuleStore()
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

      const balanceLamports = await connection.getBalance(publicKey)
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL
      const prizeDistributionPercent = data.prizeDistributionPercent
      const prizePoolSol = Number((balanceSol * (prizeDistributionPercent / 100)).toFixed(6))

      const payload = {
        ...data,
        prizeDistributionPercent,
        prizeSourceWallet: publicKey.toBase58(),
        prizeSourceBalanceSol: balanceSol,
      }

      const resp = await createConfig(payload, jwt || '')
      setControlSubmitted(true)
      setControlConfig({
        startDate: data.startDate,
        endDate: data.endDate,
        prizeDistributionPercent,
        slippageTolerancePercent: data.slippageTolerancePercent,
      })
      setPrizePoolSol(resp?.prizePoolSol ?? prizePoolSol)
      if (resp?.roundId) setRoundId(resp.roundId)
      // Simulate qualifying participants appearing in Snapshot after successful control submission
      setParticipantCounts({ t1: 147, t2: 441, t3: 882, t4: 1470 })
    } catch (error) {
      console.error('Config creation failed:', error)
      alert('Invalid parameters or server error. Please review inputs and try again.')
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
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-6 shadow-panel">
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 grid gap-5">
        {/* Start Date */}
        <div className="grid items-center gap-2 md:grid-cols-[260px,1fr]">
          <Label htmlFor="startDate" className="text-slate-300 text-xs md:text-sm">Start Date</Label>
          <div>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <DateTimePicker id="startDate" value={field.value} onChange={field.onChange} className="h-8 px-2.5 py-1.5 text-[10px] md:text-[12px]" />
              )}
            />
            {form.formState.errors.startDate && (
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.startDate.message}</p>
            )}
          </div>
        </div>

        {/* End Date */}
        <div className="grid items-center gap-2 md:grid-cols-[260px,1fr]">
          <Label htmlFor="endDate" className="text-slate-300 text-xs md:text-sm">End Date</Label>
          <div>
            <Controller
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <DateTimePicker id="endDate" value={field.value} onChange={field.onChange} className="h-8 px-2.5 py-1.5 text-[10px] md:text-[12px]" />
              )}
            />
            {form.formState.errors.endDate && (
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Trade Threshold (%) */}
        <div className="grid items-center gap-2 md:grid-cols-[260px,1fr]">
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
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.tradeThresholdPercent.message}</p>
            )}
          </div>
        </div>

        {/* Infra Allocation (%) */}
        <div className="grid items-center gap-2 md:grid-cols-[260px,1fr]">
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
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.prizeDistributionPercent.message}</p>
            )}
          </div>
        </div>

        {/* Slippage Tolerance (%) */}
        <div className="grid items-center gap-2 md:grid-cols-[260px,1fr]">
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
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.slippageTolerancePercent.message}</p>
            )}
          </div>
        </div>

        {/* Blacklisted Wallets */}
        <div className="grid items-start gap-2 md:grid-cols-[260px,1fr]">
          <Label htmlFor="blacklistedWallets" className="mt-1 text-slate-300 text-xs md:text-sm">Blacklisted Wallets (optional)</Label>
          <div>
            <Textarea
              id="blacklistedWallets"
              className="w-full rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
              placeholder="Enter comma-separated wallet addresses"
              {...form.register('blacklistedWallets')}
            />
            {form.formState.errors.blacklistedWallets && (
              <p className="mt-1 text-red-400 text-sm">{form.formState.errors.blacklistedWallets.message}</p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            Configure Parameters
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ControlForm;

