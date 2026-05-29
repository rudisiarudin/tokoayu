import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectField({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex min-h-12 w-full rounded-lg border bg-card px-4 py-3 text-base font-semibold outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
