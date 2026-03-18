import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none ${className}`.trim()}
      {...props}
    />
  ),
);
Input.displayName = "Input";
