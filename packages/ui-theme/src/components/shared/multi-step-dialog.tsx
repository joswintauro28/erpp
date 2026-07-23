"use client";

import { useCallback, useEffect, useRef } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { cn } from "../../lib/utils";

const descId = "mstep-desc";

export interface StepConfig {
  title: string;
  description?: string;
}

export interface MultiStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: StepConfig[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isSubmitting?: boolean;
  disableNext?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}

function StepIndicator({
  steps, currentStep,
}: {
  steps: StepConfig[]; currentStep: number;
}) {
  return (
    <div className="flex items-center w-full" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((step, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  state === "done" && "bg-[var(--shell-accent)] text-[var(--shell-accent-text)] shadow-sm shadow-[var(--shell-accent)]/20",
                  state === "active" && "bg-[var(--shell-brand)] text-white ring-4 ring-[var(--shell-accent)]/30 shadow-sm shadow-[var(--shell-brand)]/20",
                  state === "pending" && "border border-[var(--shell-border)] bg-[var(--shell-surface-alt)]/50 text-[var(--shell-muted)]/50",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium leading-tight text-center max-w-16 sm:block transition-colors duration-300",
                  state === "active" && "text-[var(--shell-foreground)] font-semibold tracking-wide",
                  state === "done" && "text-[var(--shell-accent-text)]",
                  state === "pending" && "text-[var(--shell-muted)]/50",
                )}
              >
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300",
                  i < currentStep ? "bg-[var(--shell-accent)]" : "bg-[var(--shell-border)]",
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
  onSubmit, isSubmitting = false, disableNext = false,
  submitLabel = "Submit", children,
}: Omit<MultiStepDialogProps, "isFirstStep" | "isLastStep">) {
  const bodyRef = useRef<HTMLDivElement>(null);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (open) bodyRef.current?.scrollTo(0, 0);
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
        className="sm:max-w-lg px-0 gap-0 overflow-hidden"
        aria-describedby={steps[currentStep]?.description ? descId : undefined}
      >
        <div className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-8 py-6">
          <DialogHeader className="gap-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold text-[var(--shell-foreground)]">
                {title}
              </DialogTitle>
              <span className="text-[11px] font-medium text-[var(--shell-muted)] tabular-nums leading-none">
                Step {currentStep + 1} / {steps.length}
              </span>
            </div>
            <StepIndicator steps={steps} currentStep={currentStep} />
            {steps[currentStep]?.description && (
              <DialogDescription id={descId} className="!mt-1 text-xs leading-relaxed text-[var(--shell-muted)]">
                {steps[currentStep].description}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            ref={bodyRef}
            className="step-form overflow-y-auto px-8 py-6 max-h-[55vh] scroll-smooth"
          >
            <div key={currentStep} className="animate-step-in">
              {children}
            </div>
          </div>

          <DialogFooter className="px-8 py-5 border-t border-[var(--shell-border)] bg-[var(--shell-surface-alt)]/50">
            <div className="flex w-full items-center justify-between">
              <div>
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
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
                  className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || (isLastStep ? false : disableNext)}
                  className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white font-semibold"
                >
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  {isLastStep ? submitLabel : "Next"}
                  {!isLastStep && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
