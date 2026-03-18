import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "icon";
};

export function Button({ className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center border text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
    outline: "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "border-transparent bg-transparent text-slate-900 hover:bg-slate-100"
  };
  const sizes = {
    default: "px-4 py-2",
    icon: "h-10 w-10"
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()} {...props} />;
}
