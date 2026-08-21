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
