"use client";

import { useCallback, useEffect, useRef } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { StepConfig, MultiStepDialogProps } from "@/types/ui";

const descId = "mstep-desc";

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
                  state === "done" && "bg-accent text-accent-foreground shadow-sm shadow-accent/20",
                  state === "active" && "bg-action text-white ring-4 ring-accent/20 shadow-sm shadow-action/20",
                  state === "pending" && "border border-border bg-muted/50 text-muted-foreground/50",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium leading-tight text-center max-w-16 sm:block transition-colors duration-300",
                  state === "active" && "text-foreground font-semibold tracking-wide",
                  state === "done" && "text-accent-foreground",
                  state === "pending" && "text-muted-foreground/50",
                )}
              >
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300",
                  i < currentStep ? "bg-accent" : "bg-border",
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
        <div className="border-b border-border bg-popover px-8 py-6">
          <DialogHeader className="gap-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                {title}
              </DialogTitle>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums leading-none">
                Step {currentStep + 1} / {steps.length}
              </span>
            </div>
            <StepIndicator steps={steps} currentStep={currentStep} />
            {steps[currentStep]?.description && (
              <DialogDescription id={descId} className="!mt-1 text-xs leading-relaxed text-muted-foreground">
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

          <DialogFooter className="px-8 py-6 border-t border-border">
            <div className="flex w-full items-center justify-between">
              <div>
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
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
                >
                  Cancel
                </Button>
                {isLastStep ? (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Spinner className="h-3.5 w-3.5" /> Saving...</>
                    ) : (
                      <><Check className="h-3.5 w-3.5" /> {submitLabel || "Save"}</>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={disableNext}
                    onClick={() => onStepChange(currentStep + 1)}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
