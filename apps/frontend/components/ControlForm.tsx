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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DateTimePicker from '@/components/ui/date-time-picker'
import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const ControlForm = () => {
  const { jwt } = useAuthStore()
  const { controlEnabled, setControlSubmitted, setParticipantCounts } = useModuleStore()

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
      infraAllocationPercent: 70,
      blacklistedWallets: '',
      startDate: defaults.start,
      endDate: defaults.end,
      slippageTolerancePercent: 0.5,
    },
  })

  const onSubmit = async (data: ConfigSchemaType) => {
    try {
      await createConfig(data, jwt || '')
      setControlSubmitted(true)
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
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 grid gap-4">
        <div>
          <Label className="text-slate-300 text-base md:text-lg">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <DateTimePicker
                value={field.value}
                onChange={field.onChange}
                className="mt-1"
              />
            )}
          />
          {form.formState.errors.startDate && (
            <p className="text-red-400 text-sm">{form.formState.errors.startDate.message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-300 text-base md:text-lg">End Date</Label>
          <Controller
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <DateTimePicker
                value={field.value}
                onChange={field.onChange}
                className="mt-1"
              />
            )}
          />
          {form.formState.errors.endDate && (
            <p className="text-red-400 text-sm">{form.formState.errors.endDate.message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-300 text-base md:text-lg">Trade Threshold (%)</Label>
          <Input
            className="w-full rounded-lg border border-primary/20 bg-night-800 px-5 py-3.5 text-[16px] md:text-[17px] text-white placeholder:text-slate-500"
            type="number"
            step="0.01"
            {...form.register('tradeThresholdPercent', { valueAsNumber: true })}
          />
          {form.formState.errors.tradeThresholdPercent && (
            <p className="text-red-400 text-sm">{form.formState.errors.tradeThresholdPercent.message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-300 text-base md:text-lg">Infra Allocation (%)</Label>
          <Input
            className="w-full rounded-lg border border-primary/20 bg-night-800 px-5 py-3.5 text-[16px] md:text-[17px] text-white placeholder:text-slate-500"
            type="number"
            step="0.01"
            {...form.register('infraAllocationPercent', { valueAsNumber: true })}
          />
          {form.formState.errors.infraAllocationPercent && (
            <p className="text-red-400 text-sm">{form.formState.errors.infraAllocationPercent.message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-300 text-base md:text-lg">Slippage Tolerance (%)</Label>
          <Input
            className="w-full rounded-lg border border-primary/20 bg-night-800 px-5 py-3.5 text-[16px] md:text-[17px] text-white placeholder:text-slate-500"
            type="number"
            step="0.01"
            {...form.register('slippageTolerancePercent', { valueAsNumber: true })}
          />
          {form.formState.errors.slippageTolerancePercent && (
            <p className="text-red-400 text-sm">{form.formState.errors.slippageTolerancePercent.message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-300 text-base md:text-lg">Blacklisted Wallets (optional)</Label>
          <Textarea
            className="w-full rounded-lg border border-primary/20 bg-night-800 px-5 py-3.5 text-[16px] md:text-[17px] text-white placeholder:text-slate-500"
            placeholder="Enter comma-separated wallet addresses"
            {...form.register('blacklistedWallets')}
          />
          {form.formState.errors.blacklistedWallets && (
            <p className="text-red-400 text-sm">{form.formState.errors.blacklistedWallets.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="rounded-lg bg-badge-gradient px-6 py-3 text-[16px] md:text-[17px] font-semibold text-white shadow-md"
        >
          Configure Parameters
        </Button>
      </form>
    </section>
  )
}

export default ControlForm;

