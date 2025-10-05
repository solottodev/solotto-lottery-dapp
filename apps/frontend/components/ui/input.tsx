// apps/frontend/components/ui/Input.tsx
// ✅ Standard input field wrapper for use with react-hook-form

import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ ...props }, ref) => <input ref={ref} className="border rounded px-3 py-2 w-full" {...props} />
);

Input.displayName = "Input";
