// apps/frontend/components/ui/Card.tsx
// ✅ Generic Card layout container
// ✅ Supports Tailwind styling via `className` prop
// ✅ Compatible with ControlForm and other shared components

// card.tsx
// Simple styled card wrapper for module layout

import React from 'react'

type BaseProps = {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: BaseProps) => (
  <div className={`rounded-2xl bg-white p-4 shadow-md dark:bg-gray-900 ${className}`}>{children}</div>
)

export const CardHeader = ({ children, className = '' }: BaseProps) => (
  <div className={`rounded-t-2xl px-4 py-3 ${className}`}>{children}</div>
)

export const CardTitle = ({ children, className = '' }: BaseProps) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)

export const CardContent = ({ children, className = '' }: BaseProps) => (
  <div className={`px-4 pb-4 ${className}`}>{children}</div>
)
