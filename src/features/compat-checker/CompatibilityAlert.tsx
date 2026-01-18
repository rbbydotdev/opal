import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBrowserCompat } from "@/features/compat-checker/CompatChecker";
import { useDismissalState } from "@/hooks/useDismissalState";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Book, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function CompatibilityAlert({ forceOpen = false }: { forceOpen?: boolean } = {}) {
  let [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useDismissalState("compatibility-alert-dismissed", false);
  const [rememberDismissal, setRememberDismissal] = useState(false);

  const navigate = useNavigate();
  const { hasCompatibilityIssues, features } = useBrowserCompat();

  useEffect(() => {
    if (hasCompatibilityIssues && (!isDismissed || forceOpen)) setIsOpen(true);
  }, [hasCompatibilityIssues, isDismissed, forceOpen]);

  const handleDismiss = () => {
    if (rememberDismissal) {
      setIsDismissed(true);
    }
    setIsOpen(false);
  };

  const getStatusIcon = (passed: boolean, required: boolean) => {
    if (passed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (required) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!hasCompatibilityIssues || (isDismissed && !forceOpen)) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="[transform:none] left-0 top-0 right-0 w-full h-full max-w-none max-h-none rounded-none translate-x-0 translate-y-0 sm:[transform:translate(-50%,-50%)] sm:left-[50%] sm:top-[50%] sm:right-auto sm:w-full sm:max-w-md sm:h-auto sm:max-h-[85vh] sm:rounded-lg flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex justify-center mb-4">
            <img src="/sadmac.jpg" alt="Sad Mac" className="h-16 w-auto" />
          </div>
          <DialogTitle className="flex items-center gap-2 justify-center">Browser Compatibility Check</DialogTitle>
          <DialogDescription className="text-center">
            {/* This application has specific browser requirements for optimal functionality. */}
            Opal Editor has specific feature requirements to function
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded border">
              {getStatusIcon(feature.passed, feature.required)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{feature.name}</span>
                  {feature.required && !feature.passed && (
                    <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded font-bold">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="!flex-col sm:space-x-0">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="remember-dismissal"
              checked={rememberDismissal}
              onCheckedChange={(checked) => setRememberDismissal(checked === true)}
            />
            <label
              htmlFor="remember-dismissal"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this again
            </label>
          </div>
          <div className="flex-shrink-0 flex-col gap-3 pt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* <Button variant="secondary" className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4" />
                Watch Demo
              </Button> */}
              <Button
                variant="outline"
                onClick={() => {
                  void navigate({ to: "/docs" });
                  setIsOpen(false);
                }}
                className="w-full sm:w-auto"
              >
                <Book className="h-4 w-4" />
                Learn More
              </Button>
              <Button onClick={handleDismiss} className="w-full sm:w-auto">
                Dismiss
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
