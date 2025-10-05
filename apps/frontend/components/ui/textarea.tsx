// apps/frontend/components/ui/Textarea.tsx
// ✅ Standard textarea component

import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ ...props }, ref) => <textarea ref={ref} className="border rounded px-3 py-2 w-full" {...props} />
);

Textarea.displayName = "Textarea";
