// apps/frontend/components/ui/Label.tsx
// ✅ Form label for inputs

import { LabelHTMLAttributes } from "react";

export const Label = ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className="block text-sm font-medium mb-1" {...props}>
    {children}
  </label>
);
