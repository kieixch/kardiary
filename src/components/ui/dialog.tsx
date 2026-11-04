"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  wide?: boolean;
  hideClose?: boolean;
}

export function DialogContent({
  children,
  title,
  description,
  className,
  wide,
  hideClose,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={cn("dialog-content", wide && "dialog-wide", className)}>
        <div className="mb-4 pr-8">
          <DialogPrimitive.Title className="font-serif text-xl leading-tight">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1.5 text-sm text-[var(--muted)]">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close className="icon-btn absolute right-4 top-4" aria-label="Close">
            <X size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
