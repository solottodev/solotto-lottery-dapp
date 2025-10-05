"use client";

import React from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function SnapshotForm() {
  const controlSubmitted = useModuleStore((s) => s.controlSubmitted)
  const jwt = useAuthStore((s) => s.jwt)

  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const disabled = !jwt || !controlSubmitted || submitting

  const onStart = async () => {
    try {
      setSubmitting(true)
      // Placeholder: POST to backend snapshot endpoint once available
      // await startSnapshot({ notes }, jwt!)
      alert('Snapshot started (stub).')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full shadow-xl border-blue-600">
      <CardHeader className="bg-blue-600 text-white">
        <CardTitle>Snapshot Module</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 mt-4">
        {!controlSubmitted && (
          <p className="text-sm text-yellow-400">
            Control configuration is required before running a snapshot.
          </p>
        )}
        <label className="block text-sm font-medium">Operator Notes (optional)</label>
        <Textarea
          placeholder="Add context or instructions"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onStart}
          disabled={disabled}
        >
          {submitting ? 'Starting...' : 'Start Snapshot'}
        </Button>
      </CardContent>
    </Card>
  )
}

