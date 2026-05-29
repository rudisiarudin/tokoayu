"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({ open, children }: { open: boolean; children: React.ReactNode }) {
  // Lock body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      {children}
    </div>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        // Mobile: full-width bottom sheet with rounded top corners, max 92% height
        // Tablet/Desktop: centered card with max-w and rounded-2xl all sides
        "pos-card w-full bg-white flex flex-col",
        "rounded-t-3xl sm:rounded-2xl",
        "max-h-[92dvh] sm:max-h-[88dvh]",
        "sm:max-w-lg sm:w-full",
        "border border-border/60",
        "shadow-xl",
        className
      )}
    >
      {/* Drag handle (mobile visual cue) + close button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        {/* Pill drag handle visible on mobile */}
        <div className="mx-auto w-10 h-1.5 rounded-full bg-muted sm:hidden absolute left-1/2 -translate-x-1/2 top-3" />
        <div className="ml-auto">
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>
      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 overscroll-contain pb-safe">
        {children}
      </div>
    </div>
  );
}
