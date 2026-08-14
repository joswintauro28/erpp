"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "../../lib/utils"
import { Button } from "./button"

export interface ConfirmOptions {
  title?: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null)

type PendingConfirm = ConfirmOptions & { resolve: (result: boolean) => void }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null)

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve })
    })
  }, [])

  const settle = React.useCallback(
    (result: boolean) => {
      pending?.resolve(result)
      setPending(null)
    },
    [pending]
  )

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <DialogPrimitive.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) settle(false)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          />
          <DialogPrimitive.Popup
            className={cn(
              "fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover p-5 text-sm text-popover-foreground shadow-overlay ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            )}
          >
            <h3 className="font-heading text-base font-semibold text-foreground">
              {pending?.title ?? "Confirm"}
            </h3>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {pending?.message}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => settle(false)}>
                {pending?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={pending?.destructive ? "destructive" : "default"}
                size="sm"
                onClick={() => settle(true)}
              >
                {pending?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx.confirm
}
