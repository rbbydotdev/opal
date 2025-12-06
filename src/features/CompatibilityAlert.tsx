import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BrowserCompatibility, type CompatibilityCheck } from "@/lib/BrowserCompatibility";
import { BrowserDetection } from "@/lib/BrowserDetection";
import { AlertTriangle, CheckCircle, ExternalLink, Smartphone, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function CompatibilityAlert() {
  let [isOpen, setIsOpen] = useState(false);
  const { storedValue: isDismissed, setStoredValue: setIsDismissed } = useLocalStorage(
    "compatibility-alert-dismissed",
    false,
    { initializeWithValue: true }
  );

  const compatibilityChecks = BrowserCompatibility.getCompatibilityChecks();
  const hasCompatibilityIssues = BrowserCompatibility.hasCompatibilityIssues();

  useEffect(() => {
    if (hasCompatibilityIssues && !isDismissed) setIsOpen(true);
  }, [hasCompatibilityIssues, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
  };

  const getStatusIcon = (check: CompatibilityCheck) => {
    const passed = check.check();
    if (passed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (check.required) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!hasCompatibilityIssues && isDismissed) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="[transform:none] left-0 top-0 right-0 w-full h-full max-w-none max-h-none rounded-none translate-x-0 translate-y-0 sm:[transform:translate(-50%,-50%)] sm:left-[50%] sm:top-[50%] sm:right-auto sm:w-full sm:max-w-md sm:h-auto sm:max-h-[85vh] sm:rounded-lg flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {BrowserDetection.isMobile() && <Smartphone className="h-5 w-5" />}
            Browser Compatibility Check
          </DialogTitle>
          <DialogDescription>
            This application has specific browser and device requirements for optimal functionality.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {compatibilityChecks.map((check, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded border">
              {getStatusIcon(check)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{check.name}</span>
                  {check.required && (
                    <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Required</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" onClick={() => window.open("#", "_blank")} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4" />
            Learn More
          </Button>
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
