// apps/frontend/components/ui/Button.tsx
// ✅ Primary button component

import { ButtonHTMLAttributes } from "react";

export const Button = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" {...props}>
    {children}
  </button>
);
