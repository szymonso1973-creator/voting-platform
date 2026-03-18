import * as React from "react";

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center text-xs font-medium ${className}`.trim()} {...props} />;
}
