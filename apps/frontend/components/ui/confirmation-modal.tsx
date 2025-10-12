// confirmation-modal.tsx
// Reusable confirmation dialog for destructive or critical actions

'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const iconColor = variant === 'danger' ? 'text-red-400' : 'text-amber-400';
  const confirmButtonStyle = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-amber-600 hover:bg-amber-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-primary/20 bg-night-900 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`rounded-full bg-night-800 p-2 ${iconColor}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-4 py-2 text-sm font-semibold text-primary shadow-md hover:bg-night-700 transition-colors"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={`w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors ${confirmButtonStyle}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
