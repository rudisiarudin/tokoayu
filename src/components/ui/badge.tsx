import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const styles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-yellow-100 text-yellow-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold", styles[variant], className)}
      {...props}
    />
  );
}
