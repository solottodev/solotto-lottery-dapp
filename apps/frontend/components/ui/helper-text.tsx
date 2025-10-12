// helper-text.tsx
// Reusable component for inline status and helper messages

import React from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

type HelperTextVariant = 'info' | 'success' | 'warning';

interface HelperTextProps {
  variant?: HelperTextVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<HelperTextVariant, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-400/30',
    icon: <Info className="h-3 w-3 sm:h-4 sm:w-4" />,
  },
  success: {
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    border: 'border-green-400/30',
    icon: <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />,
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
    icon: <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />,
  },
};

export function HelperText({ variant = 'info', children, className = '' }: HelperTextProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg border ${styles.border} ${styles.bg} p-2.5 sm:p-3 ${className}`}
    >
      <span className={`${styles.text} shrink-0 mt-0.5`}>{styles.icon}</span>
      <p className={`${styles.text} text-[10px] sm:text-xs leading-relaxed`}>{children}</p>
    </div>
  );
}
