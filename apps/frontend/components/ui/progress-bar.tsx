// progress-bar.tsx
// Reusable progress bar component for long-running operations

'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({
  progress,
  label,
  className = '',
  showPercentage = true,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
          {label && <span className="text-slate-300">{label}</span>}
          {showPercentage && (
            <span className="font-semibold text-primary">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-night-800 border border-primary/20">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
        {/* Animated shimmer effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          style={{
            transform: 'translateX(-100%)',
            animation: clampedProgress < 100 ? 'shimmer 2s infinite' : 'none',
          }}
        />
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

interface IndeterminateProgressBarProps {
  label?: string;
  className?: string;
}

export function IndeterminateProgressBar({
  label,
  className = '',
}: IndeterminateProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-2 text-xs sm:text-sm text-slate-300">
          {label}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-night-800 border border-primary/20">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{
            animation: 'indeterminate 1.5s ease-in-out infinite',
            width: '50%',
          }}
        />
      </div>
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
}
