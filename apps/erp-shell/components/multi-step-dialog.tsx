"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StepConfig, MultiStepDialogProps } from "@/types/ui";

function StepIndicator({
  steps, currentStep,
}: {
  steps: StepConfig[]; currentStep: number;
}) {
  return (
    <div className="flex items-center gap-0 w-full" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((step, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 relative">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  state === "done" && "bg-[var(--shell-accent)] text-white shadow-sm shadow-[var(--shell-accent)]/20",
                  state === "active" && "bg-[var(--shell-brand)] text-white ring-4 ring-[var(--shell-accent)]/20 font-extrabold shadow-md shadow-[var(--shell-brand)]/20",
                  state === "pending" && "border border-[var(--shell-border)] bg-[var(--shell-surface-alt)] text-[var(--shell-muted)]/70"
                )}
              >
                {state === "done" ? <Check className="h-4 w-4 stroke-[3]" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium leading-tight text-center max-w-16 sm:block transition-colors duration-300",
                  state === "active" && "text-[var(--shell-foreground)] font-bold tracking-wide",
                  state === "done" && "text-[var(--shell-accent-text)] font-semibold",
                  state === "pending" && "text-[var(--shell-muted)]/40"
                )}
              >
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-0.5 flex-1 transition-colors duration-300 rounded-full",
                  i < currentStep ? "bg-[var(--shell-accent)]" : "bg-[var(--shell-border)]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MultiStepDialog({
  open, onOpenChange, title, steps, currentStep, onStepChange,
  onSubmit, isSubmitting, disableNext,
  submitLabel, children,
}: Omit<MultiStepDialogProps, "isFirstStep" | "isLastStep">) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (open) {
      setScrollTop(0);
      bodyRef.current?.scrollTo(0, 0);
    }
  }, [open, currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) onStepChange(currentStep - 1);
  }, [currentStep, onStepChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastStep) {
      if (!disableNext) {
        onStepChange(currentStep + 1);
      }
    } else {
      onSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        aria-describedby={undefined}
        showCloseButton={false}
      >
        <div className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-6 py-5">
          <DialogHeader className="gap-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-base font-semibold text-[var(--shell-foreground)]">
                {title}
              </DialogTitle>
              <span className="text-[11px] font-medium text-[var(--shell-muted)] tabular-nums leading-none">
                Step {currentStep + 1} / {steps.length}
              </span>
            </div>
            <StepIndicator steps={steps} currentStep={currentStep} />
            {steps[currentStep]?.description && (
              <p className="text-xs text-[var(--shell-muted)] leading-relaxed mt-1">
                {steps[currentStep].description}
              </p>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            ref={bodyRef}
            className="overflow-y-auto px-6 py-5 max-h-[55vh] scroll-smooth bg-[var(--shell-surface)]"
            style={{ scrollBehavior: "smooth" }}
          >
            <div key={currentStep} className="animate-step-in">
              {children}
            </div>
          </div>

          <div className="-mx-0 flex items-center justify-between border-t border-[var(--shell-border)] bg-[var(--shell-surface-alt)]/30 px-6 py-4">
            <div>
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] shrink-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] shrink-0"
              >
                Cancel
              </Button>
              {isLastStep ? (
                <Button
                  key="submit-button"
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5 shrink-0 bg-[var(--shell-action)] hover:bg-[var(--shell-action)]/90 text-white"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Check className="h-3.5 w-3.5" /> {submitLabel || "Save"}</>
                  )}
                </Button>
              ) : (
                <Button
                  key="next-button"
                  type="button"
                  size="sm"
                  disabled={disableNext}
                  onClick={() => onStepChange(currentStep + 1)}
                  className="gap-1 shrink-0 bg-[var(--shell-action)] hover:bg-[var(--shell-action)]/90 text-white"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
