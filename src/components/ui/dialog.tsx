"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
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
    <div className={cn("pos-card w-full max-w-md rounded-2xl border bg-white", className)}>
      <div className="flex justify-end p-3 pb-0">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </div>
  );
}
