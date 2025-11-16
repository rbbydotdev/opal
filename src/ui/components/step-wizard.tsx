import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronRight } from "lucide-react";
import * as React from "react";

const stepWizardVariants = cva("flex w-full", {
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col space-y-4",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const stepVariants = cva("flex items-center transition-all duration-200", {
  variants: {
    orientation: {
      horizontal: "flex-1",
      vertical: "w-full",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const stepIndicatorVariants = cva(
  "flex items-center justify-center rounded-full border-2 transition-all duration-200",
  {
    variants: {
      state: {
        pending: "border-muted bg-background text-muted-foreground",
        current: "border-primary bg-primary text-primary-foreground",
        completed: "border-primary bg-primary text-primary-foreground",
      },
      size: {
        sm: "h-6 w-6 text-xs",
        md: "h-8 w-8 text-sm",
        lg: "h-10 w-10 text-base",
      },
    },
    defaultVariants: {
      state: "pending",
      size: "md",
    },
  }
);

export interface StepWizardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepWizardVariants> {
  currentStep: number;
  children: React.ReactNode;
}

export interface StepProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepVariants> {
  title: string;
  description?: string;
  index?: number;
  isLast?: boolean;
  state?: "pending" | "current" | "completed";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  clickable?: boolean;
}

export interface StepWizardContextValue {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  orientation: "horizontal" | "vertical";
  stepSize: "sm" | "md" | "lg";
  totalSteps: number;
}

const StepWizardContext = React.createContext<StepWizardContextValue | null>(null);

export function useStepWizard() {
  const context = React.useContext(StepWizardContext);
  if (!context) {
    throw new Error("useStepWizard must be used within a StepWizard");
  }
  return context;
}

const StepWizard = React.forwardRef<HTMLDivElement, StepWizardProps>(
  ({ className, orientation = "horizontal", currentStep, children, ...props }, ref) => {
    const [internalCurrentStep, setInternalCurrentStep] = React.useState(currentStep);

    React.useEffect(() => {
      setInternalCurrentStep(currentStep);
    }, [currentStep]);

    const stepChildren = React.Children.toArray(children).filter(
      (child): child is React.ReactElement<StepProps> => React.isValidElement(child) && child.type === Step
    );

    const contextValue: StepWizardContextValue = {
      currentStep: internalCurrentStep,
      setCurrentStep: setInternalCurrentStep,
      orientation: orientation || "horizontal",
      stepSize: "md",
      totalSteps: stepChildren.length,
    };

    return (
      <StepWizardContext.Provider value={contextValue}>
        <div ref={ref} className={cn(stepWizardVariants({ orientation }), className)} {...props}>
          {stepChildren.map((child, index) =>
            React.cloneElement(child, {
              ...child.props,
              index,
              isLast: index === stepChildren.length - 1,
              state: index < internalCurrentStep ? "completed" : index === internalCurrentStep ? "current" : "pending",
              orientation,
            })
          )}
        </div>
      </StepWizardContext.Provider>
    );
  }
);

StepWizard.displayName = "StepWizard";

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  (
    {
      className,
      title,
      description,
      index,
      isLast,
      state,
      orientation = "horizontal",
      size = "md",
      onClick,
      clickable = false,
      ...props
    },
    ref
  ) => {
    const { setCurrentStep } = useStepWizard();

    const handleClick = () => {
      if (clickable && onClick) {
        onClick();
      } else if (clickable) {
        setCurrentStep(index!);
      }
    };

    return (
      <div ref={ref} className={cn(stepVariants({ orientation }), className)} {...props}>
        <div
          className={cn(
            "flex items-center",
            clickable && "cursor-pointer hover:opacity-80",
            orientation === "vertical" ? "w-full" : ""
          )}
          onClick={handleClick}
        >
          <div className={cn(stepIndicatorVariants({ state, size }), "relative z-10 shrink-0")}>
            {state === "completed" ? <Check className="h-4 w-4" /> : <span>{index! + 1}</span>}
          </div>

          <div className={cn("ml-3 flex-1", orientation === "vertical" ? "min-w-0" : "text-center")}>
            <div
              className={cn(
                "font-medium text-sm",
                state === "current" && "text-primary",
                state === "completed" && "text-primary",
                state === "pending" && "text-muted-foreground"
              )}
            >
              {title}
            </div>
            {description && (
              <div
                className={cn(
                  "text-xs mt-1",
                  state === "current" && "text-muted-foreground",
                  state === "completed" && "text-muted-foreground",
                  state === "pending" && "text-muted-foreground"
                )}
              >
                {description}
              </div>
            )}
          </div>
        </div>

        {!isLast && orientation === "horizontal" && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className={cn("h-px flex-1 transition-colors", state === "completed" ? "bg-primary" : "bg-border")} />
            <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            <div
              className={cn(
                "h-px flex-1 transition-colors",
                index! < useStepWizard().currentStep - 1 ? "bg-primary" : "bg-border"
              )}
            />
          </div>
        )}

        {!isLast && orientation === "vertical" && (
          <div className="flex justify-start ml-4 mt-2 mb-2">
            <div className={cn("w-px h-8 transition-colors", state === "completed" ? "bg-primary" : "bg-border")} />
          </div>
        )}
      </div>
    );
  }
);

Step.displayName = "Step";

export interface StepWizardControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  onNext?: () => void;
  onPrevious?: () => void;
  onFinish?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  finishLabel?: string;
  showPrevious?: boolean;
  showNext?: boolean;
  showFinish?: boolean;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  isFinishDisabled?: boolean;
}

const StepWizardControls = React.forwardRef<HTMLDivElement, StepWizardControlsProps>(
  (
    {
      className,
      onNext,
      onPrevious,
      onFinish,
      nextLabel = "Next",
      previousLabel = "Previous",
      finishLabel = "Finish",
      showPrevious = true,
      showNext = true,
      showFinish = true,
      isNextDisabled = false,
      isPreviousDisabled = false,
      isFinishDisabled = false,
      ...props
    },
    ref
  ) => {
    const { currentStep, setCurrentStep, totalSteps } = useStepWizard();
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    const handleNext = () => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        onNext?.();
      }
    };

    const handlePrevious = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
        onPrevious?.();
      }
    };

    const handleFinish = () => {
      onFinish?.();
    };

    return (
      <div ref={ref} className={cn("flex justify-between items-center mt-6", className)} {...props}>
        <div>
          {showPrevious && !isFirstStep && (
            <Button variant="outline" onClick={handlePrevious} disabled={isPreviousDisabled}>
              {previousLabel}
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {showNext && !isLastStep && (
            <Button onClick={handleNext} disabled={isNextDisabled}>
              {nextLabel}
            </Button>
          )}

          {showFinish && isLastStep && (
            <Button onClick={handleFinish} disabled={isFinishDisabled}>
              {finishLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
);

StepWizardControls.displayName = "StepWizardControls";

export { Step, StepWizard, StepWizardControls };
